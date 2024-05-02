# Create Azure Devops\TFS WorkItem

[![Build and Test](https://github.com/develeap/Create-WorkItem-AzDO-TFS/actions/workflows/ci.yml/badge.svg)](https://github.com/develeap/Create-WorkItem-AzDO-TFS/actions/workflows/ci.yml)

This GitHub Action automates the process of creating work items in Azure DevOps or TFS.  
It allows for the creation of work items of various types and provides the option to attach files to them.

## Usage

See [`action.yml`](action.yml)

<!-- start usage -->

```yaml
- uses: develeap/Create-WorkItem-AzDO-TFS@v1
  with:
    # Azure Devops/tfs personal access token
    # [More about how to create a personal access token](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)
    # required: true
    token: ''

    # Azure Devops/tfs organization url.
    # For Azure devops: https://dev.azure.com/{organization}
    # For tfs: https://{server:port}/tfs/{collection}
    # [More about organization url](https://learn.microsoft.com/en-us/rest/api/azure/devops)
    # required: true
    organization_url: ''

    # The team project in which to create the new work item.
    # For example: myProject
    # [More about team projects](https://learn.microsoft.com/en-us/azure/devops/organizations/projects/about-projects?view-projects-in-your-organization)
    # required: true
    project: ''

    # Specify the work item type you want to create
    # Example: 'Bug' or 'Task' or 'User Story' or 'Feature' or 'Epic'
    # You can get the project work item types with REST API.
    # [More about work item type](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-item-types/list)
    # required: true
    workitem_type: ''

    # Work item fields mappings to be added to the defect in TFS.
    # Field consists of referenceName and value.
    # Example: 'Title = Title of the defect'
    # [More about work item type fields](https://learn.microsoft.com/en-us/azure/devops/boards/work-items/guidance/work-item-field?view=azure-devops)
    # You can get list of your project fields with REST API.
    # [More about fields REST API](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/fields/list)
    # required: true
    field_Mappings: ''

    # Files to attach to the work item.
    # Can be file name in the current directory, absolute path to file or path with wildcard.
    # Example: 'file.txt' or 'C:\file.txt' or 'C:\*.txt'
    # required: false
    attach_files: ''
```

<!-- end usage -->

## Basic

```yaml
- uses: develeap/Create-WorkItem-AzDO-TFS@v1
  with:
    token: '${{ secrets.azure_devops_token }}'
    organization_url: 'https://dev.azure.com/yourOrgName'
    project: 'yourProjectName'
    workitem_type: 'Task'
    field_mappings: |
      'Title = Test'
      'Tags = Auto Create Task'
      'Assigned To = someone'
      'AreaPath = test'
```

The field_mappings input need to contain a valid workitem field, either a [default fields](https://learn.microsoft.com/en-us/azure/devops/boards/work-items/guidance/work-item-field?view=azure-devops) or [custom field](https://learn.microsoft.com/en-us/azure/devops/organizations/settings/work/customize-process?view=azure-devops).

## Attach Files

Files can be attached to the work item to provide additional context or documentation.  
You can specify file paths as absolute or relative to the current directory, and wildcard characters are supported.  
Example:

<details>
<summary>Linux \ Macos</summary>

```yaml
- uses: develeap/Create-WorkItem-AzDO-TFS@v1
  with:
    token: '${{ secrets.azure_devops_token }}'
    organization_url: 'https://dev.azure.com/yourOrgName'
    project: 'yourProjectName'
    workitem_type: 'Task'
    field_mappings: |
      'Title = Test'
      'Tags = Auto Create Task'
      'Assigned To = someone'
      'AreaPath = test'
    attach_files: |
      '*.txt'
      'File-1.txt'
      '${{ github.workspace }}/File-2.txt'
```

</details>

<details>
<summary>Windows</summary>

```yaml
- uses: develeap/Create-WorkItem-AzDO-TFS@v1
  with:
    token: '${{ secrets.azure_devops_token }}'
    organization_url: 'https://dev.azure.com/yourOrgName'
    project: 'yourProjectName'
    workitem_type: 'Task'
    field_mappings: |
      'Title = Test'
      'Tags = Auto Create Task'
      'Assigned To = someone'
      'AreaPath = test'
    attach_files: |
      '*.txt'
      'File-1.txt'
      '${{ github.workspace }}\File-2.txt'
```

</details>
