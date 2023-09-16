import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { S3EventRecord, SNSEvent, SNSHandler } from 'aws-lambda';
import Jimp from 'jimp/es';
import { Readable } from 'stream';

const s3 = new S3Client();

const imageBucketName = process.env.IMAGE_S3_BUCKET;
const thumbnailBucketName = process.env.THUMBNAIL_S3_BUCKET;

const resizeImage: SNSHandler = async (event: SNSEvent) => {
  console.log('Processing SNS event ', JSON.stringify(event));
  for (const snsRecord of event.Records) {
    const s3EventStr = snsRecord.Sns.Message;
    console.log('Processing S3 event', s3EventStr);
    const s3Event = JSON.parse(s3EventStr);

    for (const record of s3Event.Records) {
      // "record" is an instance of S3EventRecord
      await processImage(record); // A function that should resize each image
    }
  }
};

async function processImage(record: S3EventRecord) {
  try {
    const key = record.s3.object.key;

    const getCommand = new GetObjectCommand({
      Bucket: imageBucketName,
      Key: key,
    });

    const { Body } = await s3.send(getCommand);

    const bodyContents = await streamToBuffer(Body as Readable);

    const image = await Jimp.read(bodyContents);

    const resizedImage = image.resize(150, Jimp.AUTO);

    const convertedBuffer = await resizedImage.getBufferAsync(Jimp.MIME_JPEG);

    const putCommand = new PutObjectCommand({
      Bucket: thumbnailBucketName,
      Key: `${key}.jpeg`,
      Body: convertedBuffer,
    });

    await s3.send(putCommand);
  } catch (e) {
    console.error('Error retrieving image from S3:', e);
  }
}

// Apparently the stream parameter should be of type Readable|ReadableStream|Blob
// The latter 2 don't seem to exist anywhere.
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export const main = resizeImage;
