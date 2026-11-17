output "instance_id" {
  description = "생성한 EC2의 ID"
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "EC2에 연결할 탄력적 IP. 실제 연결은 apply 완료 후 확인합니다."
  value       = data.aws_eip.app.public_ip
}

output "vpc_id" {
  description = "생성한 VPC의 ID"
  value       = aws_vpc.main.id
}

output "ami_id" {
  description = "이번 실행에서 선택한 Ubuntu 24.04 LTS 이미지 ID"
  value       = data.aws_ami.ubuntu.id
}

output "key_pair_name" {
  description = "EC2가 사용하는 기존 키 페어 이름"
  value       = data.aws_key_pair.ssh.key_name
}
