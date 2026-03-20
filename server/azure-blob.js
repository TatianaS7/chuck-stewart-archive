const { BlobServiceClient } = require("@azure/storage-blob");
require("dotenv").config();

// Instantiate a single BlobServiceClient for the entire application, which will be shared across functions
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connectionString) {
  throw new Error("Azure Storage Connection String not found");
}
const blobServiceClient =
  BlobServiceClient.fromConnectionString(connectionString);

// Container Cache to avoid redundant calls to Azure Blob Storage
const verifiedContainers = new Set();

async function ensureContainerExists(containerName) {
  if (verifiedContainers.has(containerName)) return;
  const containerClient = blobServiceClient.getContainerClient(containerName);
  try {
    await containerClient.create();
    console.log(`Container "${containerName}" created successfully.`);
  } catch (error) {
    if (error.details && error.details.errorCode === "ContainerAlreadyExists") {
      console.log(`Container "${containerName}" already exists.`);
    } else {
      throw error;
    }
  }
  verifiedContainers.add(containerName);
}

// Get type of image
function getContentType(base64Data) {
    if (base64Data.startsWith("data:image/png")) return "image/png";
    if (base64Data.startsWith("data:image/webp")) return "image/webp";
    return 'image/jpeg'; // Default to JPEG if type is unknown
}

// Upload Function
async function uploadToAzure(containerName, blobName, base64Data) {
  await ensureContainerExists(containerName);

  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // Strip data URL prefix if present
  const base64String = base64Data.split(",")[1] || base64Data;
  const buffer = Buffer.from(base64String, "base64");

  const contentType = getContentType(base64Data);
  const response = await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  console.log(
    `Blob "${blobName}" uploaded successfully. requestId: ${response.requestId}`,
  );

  return blockBlobClient.url;
}

// Delete Function
async function deleteBlob(containerName, blobName) {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const response = await blockBlobClient.delete();
  console.log(
    "Blob was deleted successfully. requestId: ",
    response.requestId,
  );
}

module.exports = { uploadToAzure, deleteBlob };
