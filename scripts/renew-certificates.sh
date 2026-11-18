#!/usr/bin/env bash
set -euo pipefail

# EC2의 예약 실행과 수동 실행에서 같은 Compose 경로와 갱신 절차를 사용합니다.
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ $# -gt 1 || ( $# -eq 1 && "$1" != "--dry-run" ) ]]; then
    echo "사용법: bash scripts/renew-certificates.sh [--dry-run]" >&2
    exit 1
fi

# 동일 EC2에서 예약 갱신과 수동 갱신이 겹치면 두 번째 실행을 중단합니다.
exec 9>.certbot-renew.lock
flock -n 9 || { echo "다른 인증서 갱신이 실행 중입니다." >&2; exit 1; }

compose=(docker compose -f compose.deploy.yaml -f compose.https.yaml)
"${compose[@]}" config --quiet
"${compose[@]}" run -T --rm --no-deps certbot renew \
    --cert-name outpick.chocobe.shop --non-interactive "$@"

# 갱신 시점이 아니어도 재로드는 안전하며, 갱신된 인증서를 Nginx에 반영합니다.
# 테스트 갱신은 운영 인증서를 바꾸지 않으므로 재로드하지 않습니다.
if [[ $# -eq 0 ]]; then
    "${compose[@]}" exec -T nginx nginx -t
    "${compose[@]}" exec -T nginx nginx -s reload
fi
