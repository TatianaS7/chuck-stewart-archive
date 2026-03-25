const CONVERTER_URL =
  process.env.CERTIFICATE_CONVERTER_URL || "http://127.0.0.1:5001";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getWordMimeType(fileName = "") {
  const lower = String(fileName).toLowerCase();
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/msword";
}

function stripDataUrlPrefix(value = "") {
  const commaIndex = String(value).indexOf(",");
  if (commaIndex < 0) return String(value);
  return String(value).slice(commaIndex + 1);
}

async function convertWordToPdfDataUrl({ fileName, content }) {
  if (!content) {
    throw new Error(`Missing content for ${fileName || "certificate file"}.`);
  }

  const base64Content = stripDataUrlPrefix(content);
  const sourceBuffer = Buffer.from(base64Content, "base64");

  const formData = new FormData();
  const fileBlob = new Blob([sourceBuffer], {
    type: getWordMimeType(fileName),
  });
  formData.append("file", fileBlob, fileName || "certificate.docx");

  let response;

  let lastNetworkError = null;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      response = await fetch(`${CONVERTER_URL}/convert`, {
        method: "POST",
        body: formData,
      });
      lastNetworkError = null;
      break;
    } catch (error) {
      lastNetworkError = error;

      if (attempt < 5) {
        await sleep(attempt * 300);
      }
    }
  }

  if (lastNetworkError) {
    const hint =
      "Ensure the converter is running (for dev: ./deploy.sh fullstack dev, or run python server/utils/file-converter.py).";
    throw new Error(
      `Unable to reach certificate converter at ${CONVERTER_URL} after multiple attempts. ${hint}`,
      { cause: lastNetworkError },
    );
  }

  if (!response.ok) {
    let details = response.statusText;

    // Read the response body once to avoid undici's "Body is unusable" error.
    const text = await response.text();
    if (text) {
      try {
        const errorJson = JSON.parse(text);
        details = errorJson?.error || text;
      } catch (error) {
        details = text;
      }
    }

    throw new Error(
      `Certificate conversion failed for ${fileName || "file"}: ${details}`,
    );
  }

  const pdfBuffer = Buffer.from(await response.arrayBuffer());
  return `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
}

module.exports = {
  convertWordToPdfDataUrl,
};