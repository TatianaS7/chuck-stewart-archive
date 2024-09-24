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

// async function streamToString(readableStream) {
//     readableStream.setEncoding("utf-8");
//     let data = "";
//     for await (const chunk of readableStream) {
//         data += chunk;
//     }
//     return data;
// }




        // // DELETE A CONTAINER
        // console.log("\nDeleting container...");

        // const deleteContainerResponse = await containerClient.delete();
        // console.log("Container was deleted successfully. requestId: ", deleteContainerResponse.requestId);

        // // LIST BLOB(S)
        // console.log("\nListing blobs...");

        // for await (const blob of containerClient.listBlobsFlat()) {
        //     const tempBlockBlobClient = containerClient.getBlockBlobClient(blob.name);
    
        //     // Display blob name
        //     console.log("\t", blob.name);
        // }
    
        // // DOWNLOAD BLOB(S)
        // // Get blob content from position 0 to the end
        // const downloadBlockBlobResponse = await blockBlobClient.download(0);
        // console.log("\nDownloaded blob content...");
        // console.log("\t", await streamToString(downloadBlockBlobResponse.readableStreamBody));
    



module.exports = { uploadToAzure };