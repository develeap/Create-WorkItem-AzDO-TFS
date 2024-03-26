const core = require('@actions/core');
const azureDevOpsApi = require('azure-devops-node-api');
const path = require('path');
const glob = require('glob');
const fs = require('fs');

/**
 * Creates attachments for work items.
 *
 * @param {import('azure-devops-node-api/WorkItemTrackingApi').IWorkItemTrackingApi} workItemTrackingApi - The Work Item Tracking API.
 * @param {string[]} attachFiles - An array of file paths to attach.
 * @param {object} [options] - Optional parameters for attachment creation.
 * @param {any} [options.customHeaders] - Custom headers for the request.
 * @param {string} [options.uploadType='Simple'] - The type of upload.
 * @param {string} [options.project=null] - The project to associate the attachment with.
 * @param {string} [options.areaPath=null] - The area path to associate the attachment with.
 * @returns {Promise<object[]>} - A promise that resolves to an array of created attachments.
 */
async function createAttachments(
  workItemTrackingApi,
  attachFiles,
  options = {
    customHeaders: [],
    uploadType: 'Simple',
    project: null,
    areaPath: null
  }
) {
  const { customHeaders, uploadType, project, areaPath } = options;
  const attachFilesPathArray = [];
  const attachArray = [];

  // Resolve file paths and save them in array
  await Promise.all(
    attachFiles.map(async line => {
      const matchingFiles = await glob.glob(
        line.replaceAll("'", '').replaceAll('"', '').replaceAll('\\', '/')
      );
      matchingFiles.forEach(matchingFile => {
        attachFilesPathArray.push(path.resolve(matchingFile));
      });
    })
  );

  // Log attachFilesPathArray if in debug mode
  if (core.isDebug()) {
    core.debug(`attachFilesPathArray: ${attachFilesPathArray}`);
  }

  if (attachFilesPathArray.length <= 0) {
    throw new Error(
      'Create Attachments failed. Maybe one of the file not exists.'
    );
  }
  // Create attachments for each file in the array and save them in new array
  await Promise.all(
    attachFilesPathArray.map(async filePath => {
      const fileName = path.basename(filePath);
      const contentStream = fs.createReadStream(filePath);

      // Attempt to create attachment and catch error if it fails
      const attachResult = await workItemTrackingApi.createAttachment(
        customHeaders,
        contentStream,
        fileName,
        uploadType,
        project,
        areaPath
      );

      attachArray.push(attachResult);
    })
  );

  return attachArray;
}

/**
 * Sets the fields for a work item.
 * @param {import('azure-devops-node-api/WorkItemTrackingApi').IWorkItemTrackingApi} workItemTrackingApi - The Work Item Tracking API.
 * @param {Map<string, string>} fieldMappingsMap - A map of field mappings where the key is the field name and the value is the field value.
 * @param {string} project - The project name.
 * @returns {Promise<Object>} - A promise that resolves to an object representing the field mappings.
 */
async function setFields(workItemTrackingApi, fieldMappingsMap, project) {
  const fieldMap = new Map();
  const workItemFields = await workItemTrackingApi.getFields(project);

  fieldMappingsMap.forEach((value, key) => {
    const fieldObject = workItemFields.find(
      field =>
        field.name.toLocaleLowerCase() === key.toLocaleLowerCase() ||
        field.name.toLocaleLowerCase().replace(' ', '') ===
          key.toLocaleLowerCase()
    );

    if (!fieldObject) {
      throw new Error(
        `Field '${key}' not found. Please check the if the field name is correct.`
      );
    }

    const fieldReferenceName = fieldObject.referenceName;

    fieldMap.set(fieldReferenceName, value);
  });

  return fieldMap;
}

/**
 * Creates the body for a work item based on the provided field mappings and attachments.
 * @param {Map<string, any>} fieldMappingsMap - A map containing the field mappings.
 * @param {Array} [options.attachmentsArray=[]] - An array of attachments to be added to the request body.
 * @returns {Array<object>} - The body of the work item.
 */
function createBody(fieldMappingsMap, options = { attachmentsArray: [] }) {
  const { attachmentsArray } = options;
  const requestBodyArray = [];

  // Add field mappings to the request body
  fieldMappingsMap.forEach((Value, key) => {
    requestBodyArray.push({
      op: 'add',
      path: `/fields/${key}`,
      value: Value
    });
  });

  // Add attachments to the request body
  if (attachmentsArray) {
    attachmentsArray.forEach(attachment => {
      requestBodyArray.push({
        op: 'add',
        path: '/relations/-',
        value: {
          rel: 'AttachedFile',
          url: attachment.url,
          attributes: {
            comment: 'Attachment added'
          }
        }
      });
    });
  }

  // Log the request body if in debug mode
  if (core.isDebug()) {
    core.debug(`"Request body": ${JSON.stringify(requestBodyArray)}`);
  }

  return requestBodyArray;
}

/**
 * Creates a new work item using the provided parameters.
 *
 * @param {import('azure-devops-node-api/WorkItemTrackingApi').IWorkItemTrackingApi} workItemTrackingApi - The Work Item Tracking API.
 * @param {string} project - The project name or ID.
 * @param {string} workItemType - The type of work item to create.
 * @param {string[]} fieldMappings - An array of field mappings in the format "key=value".
 * @param {object} [options] - Optional parameters for the work item creation.
 * @param {string[]} [options.attachmentsArray=[]] - An array of attachment URLs.
 * @param {any} [options.customHeaders] - Custom headers to include in the request.
 * @param {boolean} [options.validateOnly=false] - Indicates whether to validate the work item without saving it.
 * @param {boolean} [options.bypassRules=false] - Indicates whether to bypass the work item rules.
 * @param {boolean} [options.suppressNotifications=false] - Indicates whether to suppress notifications for the work item.
 * @param {string} [options.expand=None] - The expand parameter for the work item creation.
 * @returns {Promise<object>} A promise that resolves to the created work item object.
 * @throws {Error} If the work item creation fails or if any of the inputs are incorrect.
 */
async function createWorkItem(
  workItemTrackingApi,
  project,
  workItemType,
  fieldMappings,
  options = {
    attachmentsArray: [],
    customHeaders: [],
    validateOnly: false,
    bypassRules: false,
    suppressNotifications: false,
    expand: 'None'
  }
) {
  const {
    attachmentsArray,
    customHeaders,
    validateOnly,
    bypassRules,
    suppressNotifications,
    expand
  } = options;
  const fieldMappingsMap = new Map();

  // Create a map of field key and there values
  fieldMappings
    .map(line => line.replaceAll("'", '').replaceAll('"', ''))
    .forEach(pair => {
      const [key, value] = pair.split('=').map(s => s.trim());
      fieldMappingsMap.set(key, value);
    });

  // Set the fields for the work item with there reference name
  const fieldMap = await setFields(
    workItemTrackingApi,
    fieldMappingsMap,
    project
  );

  // Create the request body for the work item
  const requestBodyArray = createBody(fieldMap, attachmentsArray);

  // Attempt to create the work item and catch error if it fails
  const workItem = await workItemTrackingApi.createWorkItem(
    customHeaders,
    requestBodyArray,
    project,
    workItemType,
    validateOnly,
    bypassRules,
    suppressNotifications,
    expand
  );

  // Return the created work item or throw error
  if (workItem != null) {
    return workItem;
  } else {
    throw new Error(
      'Create WorkItem failed. Maybe one of the inputs is incorrect.'
    );
  }
}

/**
 * Main function to perform the action of creating a work item with attachments.
 *
 * @param {string} token - The personal access token for authentication.
 * @param {string} organizationUrl - The URL of the Azure DevOps organization.
 * @param {string} project - The name of the project.
 * @param {string} workItemType - The type of the work item.
 * @param {object[]} fieldMappingsInput - An array of field mappings for the work item.
 * @param {object[]} attachFilesInput - An array of files to attach to the work item.
 * @returns {Promise<void>} - A promise that resolves when the work item is created.
 */
async function actionMain(
  token,
  organizationUrl,
  project,
  workItemType,
  fieldMappingsInput,
  attachFilesInput
) {
  // Create a new connection to Azure Devops/tfs
  const authHandler = azureDevOpsApi.getPersonalAccessTokenHandler(token);
  const connection = new azureDevOpsApi.WebApi(organizationUrl, authHandler);
  const workItemTrackingApi = await connection.getWorkItemTrackingApi();

  core.startGroup('Create the attachments');

  let attachmentsArray = [];
  // Create the attachments for the work item
  if (attachFilesInput) {
    attachmentsArray = await createAttachments(
      workItemTrackingApi,
      attachFilesInput,
      {
        customHeaders: [],
        uploadType: 'Simple',
        project,
        areaPath: null
      }
    );
  }

  core.endGroup();

  core.startGroup('Create the workitem');

  // Create the work item with the provided field mappings and attachments
  const workItem = await createWorkItem(
    workItemTrackingApi,
    project,
    workItemType,
    fieldMappingsInput,
    {
      attachmentsArray
    }
  );

  // Log the work item URL and set the output
  core.debug(`workItem: ${JSON.stringify(workItem)}`);
  core.info(`Workitem was created: \x1B[1m${workItem._links.html.href}\x1B[0m`);
  core.setOutput('workitem_url', workItem._links.html.href);

  core.endGroup();
}

/**
 * Runs the main logic of the program.
 * @returns {Promise<void>} A promise that resolves when the program finishes executing.
 */
async function run() {
  // Define inputs
  /**
   * Access token for authentication.
   * @type {string}
   */
  const token = core.getInput('token', { required: true });
  core.debug(`token: ${token}`);

  /**
   * The URL of the organization.
   * @type {string}
   */
  const organizationUrl = core.getInput('organization_url', {
    required: true
  });
  core.debug(`organization url: ${organizationUrl}`);

  /**
   * The project name.
   * @type {string}
   */
  const project = core.getInput('project', { required: true });
  core.debug(`project: ${project}`);

  /**
   * The type of work item.
   * @type {string}
   */
  const workItemType = core.getInput('workitem_type', { required: true });
  core.debug(`workitem type: ${workItemType}`);

  /**
   * Represents the field mappings input.
   * @type {string[]}
   */
  const fieldMappingsInput = core.getMultilineInput('field_mappings', {
    required: true
  });
  core.debug(`field mappings input: ${fieldMappingsInput}`);

  /**
   * Input for attaching files.
   * @type {string[]}
   */
  const attachFilesInput = core.getMultilineInput('attach_files');
  core.debug(`attach files input: ${attachFilesInput}`);

  // Run the main logic
  try {
    await actionMain(
      token,
      organizationUrl,
      project,
      workItemType,
      fieldMappingsInput,
      attachFilesInput
    );
  } catch (error) {
    core.setFailed(`${error?.message ?? error}`);
  }
}

module.exports = {
  createAttachments,
  run
};
