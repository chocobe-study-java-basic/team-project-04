variable "aws_profile" {
  description = "데브코스 인증 정보가 등록된 로컬 AWS CLI 프로필 이름"
  type        = string
  default     = "outpick"
}

variable "aws_account_id" {
  description = "콘솔에서 확인한 데브코스 AWS 계정 ID. 다른 계정에서 실행되는 것을 막습니다."
  type        = string

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "AWS 계정 ID는 숫자 12자리로 입력해 주세요."
  }
}

variable "ssh_allowed_cidr" {
  description = "SSH 접속을 허용할 현재 공인 IPv4 주소. 예: 203.0.113.10/32"
  type        = string

  validation {
    condition     = can(cidrnetmask(var.ssh_allowed_cidr)) && can(regex("/32$", var.ssh_allowed_cidr))
    error_message = "SSH 허용 주소는 공인 IPv4 한 개를 지정하는 /32 형식으로 입력해 주세요."
  }
}

variable "key_pair_name" {
  description = "서울 리전 콘솔에서 미리 생성한 EC2 접속용 키 페어 이름"
  type        = string
  default     = "devcos-team05--ec2-keypair"
}

variable "eip_allocation_id" {
  description = "서울 리전에 미리 할당해 보관하는 팀 EIP의 할당 ID. 예: eipalloc-0123456789abcdef0"
  type        = string

  validation {
    condition     = can(regex("^eipalloc-([0-9a-f]{8}|[0-9a-f]{17})$", var.eip_allocation_id))
    error_message = "EIP 할당 ID는 eipalloc- 뒤에 8자리 또는 17자리 16진수가 오는 형식으로 입력해 주세요."
  }
}

variable "instance_type" {
  description = "EC2 사양. 처음에는 t3.small을 사용하고 메모리 확장이 필요하면 t3.medium을 검토합니다."
  type        = string
  default     = "t3.small"

  validation {
    condition     = contains(["t3.small", "t3.medium"], var.instance_type)
    error_message = "현재 구성에서는 t3.small 또는 t3.medium을 사용해 주세요."
  }
}

variable "root_volume_size_gib" {
  description = "운영체제와 이후 앱·MySQL을 저장할 gp3 디스크 용량(GiB)"
  type        = number
  default     = 20

  validation {
    condition     = var.root_volume_size_gib >= 20 && floor(var.root_volume_size_gib) == var.root_volume_size_gib
    error_message = "디스크 용량은 20 이상의 정수로 입력해 주세요."
  }
}
