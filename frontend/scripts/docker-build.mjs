import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const frontendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [outputMode, imageTag] = process.argv.slice(2);
const keyName = 'NEXT_PUBLIC_KAKAO_MAP_JS_KEY';

if (!['--load', '--push'].includes(outputMode) || !imageTag) {
  console.error('사용법: node frontend/scripts/docker-build.mjs --load|--push 이미지태그');
  process.exit(1);
}

/** 환경 파일을 실행하지 않고 읽습니다. 개인 .env.local과 셸의 같은 이름 값은 사용하지 않습니다. */
function readKakaoKey() {
  let config;
  try {
    config = parseEnv(readFileSync(resolve(frontendDirectory, '.env'), 'utf8'));
  } catch {
    console.error('frontend/.env를 읽을 수 없습니다. 파일을 만들고 카카오 JavaScript 키를 설정하세요.');
    process.exit(1);
  }

  const key = config[keyName]?.trim();
  if (!key) {
    console.error(`frontend/.env에 ${keyName}를 설정하세요. 카카오 JavaScript 키를 사용합니다.`);
    process.exit(1);
  }
  return key;
}

// 인자에는 키 이름만 넣고 값은 자식 프로세스 환경으로 전달해 명령 출력에 노출하지 않습니다.
const result = spawnSync('docker', [
  'buildx', 'build',
  '--platform', 'linux/amd64,linux/arm64',
  '--build-arg', 'NEXT_PUBLIC_API_BASE_URL=/',
  '--build-arg', keyName,
  '-t', `chocobe/outpick-frontend:${imageTag}`,
  outputMode, './frontend',
], {
  cwd: resolve(frontendDirectory, '..'),
  env: { ...process.env, [keyName]: readKakaoKey() },
  stdio: 'inherit',
});

if (result.error) {
  console.error('Docker를 실행하지 못했습니다. Docker 설치와 실행 상태를 확인하세요.');
}
process.exit(result.status ?? 1);
