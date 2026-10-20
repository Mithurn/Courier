#!/usr/bin/env bash
# Create the Courier EC2 instance (one time). Reads Google and Slack keys from backend/.env.
#   deploy/aws/up.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
. deploy/aws/lib.sh
INSTANCE_TYPE=${INSTANCE_TYPE:-t3.medium}
BUCKET=$(bucket)

[ -z "$(iid)" ] || { echo "instance already exists: $(iid)"; exit 1; }
[ -f backend/.env ] || { echo "no backend/.env"; exit 1; }
pick() { grep -E "^$1=" backend/.env | head -1 | cut -d= -f2-; }
rand() { head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9'; }

if ! aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  aws s3api create-bucket --bucket "$BUCKET" --create-bucket-configuration LocationConstraint="$REGION" >/dev/null
  aws s3api put-public-access-block --bucket "$BUCKET" \
    --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
fi
upload_release

{
  echo "DOMAIN=$DOMAIN_NAME.duckdns.org"
  echo "MYSQL_ROOT_PASSWORD=$(rand)"
  echo "JWT_SECRET=$(openssl rand -hex 32)"
  echo "BULLBOARD_USER=admin"
  echo "BULLBOARD_PASSWORD=$(rand)"
  echo "BULLBOARD_PATH=/admin/queues"
  for k in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET SLACK_CLIENT_ID SLACK_CLIENT_SECRET; do echo "$k=$(pick $k)"; done
  grep -E '^[A-Z_]+=' deploy/.env.prod.example | grep -vE '^(DOMAIN|MYSQL_ROOT_PASSWORD|JWT_SECRET|BULLBOARD_|GOOGLE_|SLACK_)'
} > /tmp/courier.env
aws ssm put-parameter --name /courier/env --type SecureString --overwrite --value file:///tmp/courier.env >/dev/null
rm -f /tmp/courier.env

if ! aws iam get-role --role-name courier >/dev/null 2>&1; then
  aws iam create-role --role-name courier --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  aws iam attach-role-policy --role-name courier --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
  aws iam put-role-policy --role-name courier --policy-name deploy-read --policy-document \
    "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"ssm:GetParameter\",\"kms:Decrypt\"],\"Resource\":\"*\"},{\"Effect\":\"Allow\",\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::$BUCKET/*\"}]}"
  aws iam create-instance-profile --instance-profile-name courier >/dev/null
  aws iam add-role-to-instance-profile --instance-profile-name courier --role-name courier
  sleep 12
fi

VPC=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)
SG=$(aws ec2 describe-security-groups --filters Name=group-name,Values=courier Name=vpc-id,Values="$VPC" --query 'SecurityGroups[0].GroupId' --output text)
if [ "$SG" = "None" ]; then
  SG=$(aws ec2 create-security-group --group-name courier --description Courier --vpc-id "$VPC" --query GroupId --output text)
  for p in 80 443; do aws ec2 authorize-security-group-ingress --group-id "$SG" --protocol tcp --port $p --cidr 0.0.0.0/0 >/dev/null; done
fi

AMI=$(aws ssm get-parameter --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id --query Parameter.Value --output text)
sed -e "s|__REGION__|$REGION|g" -e "s|__BUCKET__|$BUCKET|g" -e "s|__DOMAIN_NAME__|$DOMAIN_NAME|g" deploy/aws/user-data.sh > /tmp/courier-user-data.sh

ID=$(aws ec2 run-instances --image-id "$AMI" --instance-type "$INSTANCE_TYPE" --security-group-ids "$SG" \
  --iam-instance-profile Name=courier --user-data file:///tmp/courier-user-data.sh \
  --metadata-options HttpTokens=required \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=20,VolumeType=gp3,DeleteOnTermination=true}' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$NAME}]" --query 'Instances[0].InstanceId' --output text)
rm -f /tmp/courier-user-data.sh
echo "created $ID. First boot builds everything (~10 min). Watch: deploy/aws/status.sh"
