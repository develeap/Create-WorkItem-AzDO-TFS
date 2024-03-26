const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { createAttachments } = require('../src/main');

// Mock the workItemTrackingApi
const workItemTrackingApi = {
  createAttachment: jest.fn()
};

describe('createAttachments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates attachments for each file', async () => {
    const attachFiles = ['file1.txt', 'file2.txt'];
    const options = {
      customHeaders: [],
      uploadType: 'Simple',
      project: null,
      areaPath: null
    };

    // Mock the fs.createReadStream function
    jest.spyOn(fs, 'createReadStream').mockReturnValue('mockedStream');

    // Mock the glob function
    jest
      .spyOn(glob, 'glob')
      .mockResolvedValueOnce(['file1.txt'])
      .mockResolvedValueOnce(['file2.txt']);

    // Mock the workItemTrackingApi.createAttachment function
    workItemTrackingApi.createAttachment
      .mockResolvedValueOnce('attachmentResult1')
      .mockResolvedValueOnce('attachmentResult2');

    const attachArray = await createAttachments(
      workItemTrackingApi,
      attachFiles,
      options
    );

    expect(attachArray).toEqual(['attachmentResult1', 'attachmentResult2']);
    expect(fs.createReadStream).toHaveBeenCalledTimes(2);
    expect(workItemTrackingApi.createAttachment).toHaveBeenCalledTimes(2);
    expect(workItemTrackingApi.createAttachment).toHaveBeenCalledWith(
      options.customHeaders,
      'mockedStream',
      'file1.txt',
      options.uploadType,
      options.project,
      options.areaPath
    );
    expect(workItemTrackingApi.createAttachment).toHaveBeenCalledWith(
      options.customHeaders,
      'mockedStream',
      'file2.txt',
      options.uploadType,
      options.project,
      options.areaPath
    );
  });

  it('throws an error if createAttachment fails', async () => {
    const attachFiles = [];
    const options = {
      customHeaders: [],
      uploadType: 'Simple',
      project: null,
      areaPath: null
    };

    // Mock the fs.createReadStream function
    jest.spyOn(fs, 'createReadStream').mockReturnValue('mockedStream');

    // Mock the glob function
    jest.spyOn(glob, 'glob').mockResolvedValue([]);

    // Mock the workItemTrackingApi.createAttachment function to throw an error
    workItemTrackingApi.createAttachment.mockRejectedValue(
      new Error('Create Attachments failed. Maybe one of the file not exists.')
    );

    await expect(
      createAttachments(workItemTrackingApi, attachFiles, options)
    ).rejects.toThrow(
      'Create Attachments failed. Maybe one of the file not exists.'
    );
  });
});
