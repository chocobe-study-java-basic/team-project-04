#!/bin/bash
set -Eeuo pipefail
trap 'echo "Docker setup failed at line ${LINENO}" >&2' ERR

# user_data는 root로 실행됩니다. EIP 연결과 다른 패키지 작업을 기다릴 수 있게 설정합니다.
export DEBIAN_FRONTEND=noninteractive
apt_options=(-o DPkg::Lock::Timeout=300 -o Acquire::Retries=10)
apt-get "${apt_options[@]}" -o APT::Update::Error-Mode=any update
apt-get "${apt_options[@]}" install -y ca-certificates curl

install -m 0755 -d /etc/apt/keyrings
curl --fail --silent --show-error --location \
  --retry 20 --retry-all-errors --retry-delay 5 \
  --connect-timeout 10 --max-time 60 \
  https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

. /etc/os-release
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

apt-get "${apt_options[@]}" -o APT::Update::Error-Mode=any update
apt-get "${apt_options[@]}" install -y \
  docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker.service containerd.service
usermod -aG docker ubuntu

docker info --format '{{.ServerVersion}}'
docker compose version
echo 'Docker setup completed'
