import os
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
from dotenv import load_dotenv

load_dotenv()

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "vocal-remover-files")

s3_client = boto3.client(
    "s3",
    endpoint_url=MINIO_ENDPOINT,
    aws_access_key_id=MINIO_ACCESS_KEY,
    aws_secret_access_key=MINIO_SECRET_KEY,
    region_name="us-east-1",
    config=Config(signature_version='s3v4', s3={'addressing_style': 'path'})
)

def init_bucket():
    try:
        s3_client.head_bucket(Bucket=MINIO_BUCKET)
    except ClientError:
        s3_client.create_bucket(Bucket=MINIO_BUCKET)

def upload_file_to_minio(file_path: str, object_name: str) -> bool:
    try:
        s3_client.upload_file(file_path, MINIO_BUCKET, object_name)
        return True
    except ClientError as e:
        print(f"Failed to upload {file_path} to MinIO: {e}")
        return False

def generate_presigned_url(object_name: str, expiration=3600) -> str:
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': MINIO_BUCKET, 'Key': object_name},
            ExpiresIn=expiration
        )
        return url
    except ClientError as e:
        print(f"Failed to generate presigned URL for {object_name}: {e}")
        return None
