locals {
  name_prefix = "devcos-team05--"
  common_tags = {
    Team      = "devcos-team05"
    Project   = "outpick"
    ManagedBy = "terraform"
  }
}

# Canonical이 배포한 Ubuntu 24.04 LTS x86_64 이미지를 서울 리전에서 조회합니다.
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# 콘솔에서 만든 키를 조회만 합니다. 키 생성·삭제와 로컬 개인 키는 관리하지 않습니다.
data "aws_key_pair" "ssh" {
  key_name = var.key_pair_name
}

resource "aws_vpc" "main" {
  cidr_block           = "10.5.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${local.name_prefix}vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.5.1.0/24"
  map_public_ip_on_launch = false

  tags = {
    Name = "${local.name_prefix}public-subnet"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${local.name_prefix}public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "ec2" {
  name        = "${local.name_prefix}ec2-sg"
  description = "Allow SSH from the operator IPv4 address"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH from the operator"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  egress {
    description = "Outbound access for package and image downloads"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}ec2-sg"
  }
}

# VPC 생성 시 AWS가 함께 만드는 기본 리소스에도 팀 태그를 적용합니다.
# 기본 보안 그룹은 사용하지 않으며, 통신 규칙을 비워 둡니다.
resource "aws_default_security_group" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}default-sg"
  }
}

resource "aws_default_route_table" "main" {
  default_route_table_id = aws_vpc.main.default_route_table_id

  tags = {
    Name = "${local.name_prefix}default-rt"
  }
}

# 네트워크 ACL은 서브넷의 통과 규칙입니다. 기본 허용 동작을 유지하고,
# 실제 SSH 접속 제한은 위의 EC2 보안 그룹에서 적용합니다.
resource "aws_default_network_acl" "main" {
  default_network_acl_id = aws_vpc.main.default_network_acl_id
  subnet_ids             = [aws_subnet.public.id]

  ingress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = {
    Name = "${local.name_prefix}default-nacl"
  }
}

# EC2의 네트워크 연결에도 팀 이름을 붙이도록 인터페이스를 직접 관리합니다.
resource "aws_network_interface" "ec2" {
  subnet_id       = aws_subnet.public.id
  security_groups = [aws_security_group.ec2.id]

  tags = {
    Name = "${local.name_prefix}ec2-eni"
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  key_name      = data.aws_key_pair.ssh.key_name

  user_data                   = file("${path.module}/scripts/install-docker.sh")
  user_data_replace_on_change = true

  depends_on = [aws_route_table_association.public]

  volume_tags = merge(local.common_tags, {
    Name = "${local.name_prefix}root-volume"
  })

  primary_network_interface {
    network_interface_id = aws_network_interface.ec2.id
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size_gib
    encrypted             = true
    delete_on_termination = true
  }

  # 크레딧을 모두 쓰면 기본 CPU 성능으로 제한하며, 초과 크레딧 요금을 피합니다.
  credit_specification {
    cpu_credits = "standard"
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tags = {
    Name = "${local.name_prefix}ec2"
  }
}

resource "aws_eip" "app" {
  domain = "vpc"

  tags = {
    Name = "${local.name_prefix}eip"
  }
}

resource "aws_eip_association" "app" {
  allocation_id        = aws_eip.app.id
  network_interface_id = aws_network_interface.ec2.id

  depends_on = [aws_instance.app, aws_internet_gateway.main]
}
