const { BlobServiceClient } = require("@azure/storage-blob");
const { v1: uuidv1 } = require("uuid");
require("dotenv").config();

async function uploadToAzure(containerName, blobName, base64Data) {
    try {
        console.log("Azure Blob storage v12 - Chuck Stewart Archive");
        // Quick start code goes here
        const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

        if(!AZURE_STORAGE_CONNECTION_STRING) {
            throw new Error("Azure Storage Connection String not found");
        }

        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

        console.log("\nCreating container...");
        console.log("\t", containerName);

        // Get reference to a container
        const containerClient = blobServiceClient.getContainerClient(containerName);

       // Attempt to create the container
       try {
        const createContainerResponse = await containerClient.create();
        console.log("Container was created successfully. requestId: ", createContainerResponse.requestId);
        } catch (error) {
            if (error.details && error.details.errorCode === 'ContainerAlreadyExists') {
                console.log("Container already exists.");
            } else {
                throw error;
            }
        }

        // Get a block blob client
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        // Display blob name and URL
        console.log(`\nUploading to Azure storage as blob:\n\t, ${blobName}:\n\tURL ${blockBlobClient.url}`);

        // Remove the data URL prefix to get the base64 data
        const base64String = base64Data.split(",")[1];

        // Convert the base64 string to a buffer
        const buffer = Buffer.from(base64String, "base64");

        // Upload data to the blob
        const uploadBlobResponse = await blockBlobClient.upload(buffer, buffer.length, {
            blobHTTPHeaders: { blobContentType: "image/jpeg" }
        });
        console.log("Blob was uploaded successfully. requestId: ", uploadBlobResponse.requestId);

        console.log("Blob URL: ", blockBlobClient.url);
        return blockBlobClient.url;

    } catch (error) {
        console.log(error.message);
    }
}

async function deleteBlob(containerName, blobName) {
    try {
        const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

        if (!AZURE_STORAGE_CONNECTION_STRING) {
            throw new Error("Azure Storage Connection String not found");
        }

        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        const deleteBlobResponse = await blockBlobClient.delete();  
        console.log("Blob was deleted successfully. requestId: ", deleteBlobResponse.requestId);
    } catch (error) {
        console.log(error.message);
    }
}


module.exports = { uploadToAzure, deleteBlob };