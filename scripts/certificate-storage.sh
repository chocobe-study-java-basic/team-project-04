#!/usr/bin/env bash
set -euo pipefail
umask 077

# EC2에서 Certbot 설정 전체를 백업하거나 비어 있는 볼륨에 복원합니다.
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ $# -ne 2 || ( "$1" != "backup" && "$1" != "restore" ) ]]; then
    echo "사용법: bash scripts/certificate-storage.sh backup|restore /백업/파일.tar.gz" >&2
    exit 1
fi
action=$1
archive=$2
[[ "$archive" = /* ]] || { echo "백업 파일의 절대 경로를 입력하세요." >&2; exit 1; }

# 갱신 도중 불완전한 파일을 백업하거나 복원하지 않도록 같은 잠금을 사용합니다.
exec 9>.certbot-renew.lock
flock -n 9 || { echo "다른 인증서 작업이 실행 중입니다." >&2; exit 1; }
compose=(docker compose -f compose.deploy.yaml)
"${compose[@]}" config --quiet

if [[ "$action" = backup ]]; then
    [[ ! -e "$archive" && ! -L "$archive" ]] || { echo "기존 백업을 덮어쓰지 않습니다. 새 파일명을 지정하세요." >&2; exit 1; }
    "${compose[@]}" run -T --rm --no-deps --entrypoint sh certbot -c \
        'test -s /etc/letsencrypt/live/outpick.chocobe.shop/fullchain.pem && test -s /etc/letsencrypt/live/outpick.chocobe.shop/privkey.pem && test -s /etc/letsencrypt/renewal/outpick.chocobe.shop.conf'
    temporary=$(mktemp "${archive}.tmp.XXXXXX")
    trap 'rm -f "$temporary"' EXIT
    "${compose[@]}" run -T --rm --no-deps --entrypoint tar certbot \
        -C /etc/letsencrypt -czf - . > "$temporary"
    tar -tzf "$temporary" >/dev/null
    mv "$temporary" "$archive"
    echo "인증서·개인 키·계정·갱신 설정 전체 백업 완료: $archive"
else
    [[ -f "$archive" ]] || { echo "백업 파일을 찾을 수 없습니다." >&2; exit 1; }
    # 자신이 만든 백업만 사용합니다. 기존 인증서가 있으면 덮어쓰지 않습니다.
    "${compose[@]}" run -T --rm --no-deps --entrypoint sh certbot -c '
        if [ -n "$(ls -A /etc/letsencrypt)" ]; then
            echo "인증서 볼륨이 비어 있지 않아 복원을 중단합니다." >&2
            exit 1
        fi
        tar -C /etc/letsencrypt -xzf -
        test -s /etc/letsencrypt/live/outpick.chocobe.shop/fullchain.pem
        test -s /etc/letsencrypt/live/outpick.chocobe.shop/privkey.pem
        test -s /etc/letsencrypt/renewal/outpick.chocobe.shop.conf
    ' < "$archive"
    echo "인증서 복원 완료. 유효기간과 HTTPS 설정을 확인하세요."
fi
