import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [action, ...extra] = process.argv.slice(2);
if (!['import', 'list', 'publish-initial', 'shell'].includes(action) || extra.length) {
  console.error('사용법: node backend/scripts/local-places.mjs import|list|publish-initial|shell');
  process.exit(1);
}

let config;
try {
  // .env를 셸 코드로 실행하지 않고 값으로 읽습니다.
  config = parseEnv(readFileSync(resolve(projectRoot, '.env'), 'utf8'));
} catch {
  console.error('프로젝트 루트의 .env를 읽을 수 없습니다.');
  process.exit(1);
}
const required = ['MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD'];
if (action === 'import') required.push('TOUR_API_KEY');
for (const name of required) {
  if (!config[name]?.trim()) {
    console.error(`프로젝트 루트 .env에 ${name}를 설정하세요.`);
    process.exit(1);
  }
}

// 필요한 값만 전달합니다. 로컬 수집의 접속 대상은 Compose가 공개한 로컬 포트입니다.
const env = { ...process.env };
for (const name of ['MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_ROOT_PASSWORD']) {
  if (config[name] !== undefined) env[name] = config[name];
}
env.MYSQL_HOST = '127.0.0.1';
env.MYSQL_PORT = config.MYSQL_PORT || '3306';
delete env.TOUR_API_KEY;

let result;
if (action === 'import') {
  env.TOUR_API_KEY = config.TOUR_API_KEY;
  const windows = process.platform === 'win32';
  result = spawnSync(windows ? 'cmd.exe' : './gradlew', windows
    ? ['/d', '/c', 'gradlew.bat', 'importTourPlaces', '--no-daemon']
    : ['importTourPlaces', '--no-daemon'], {
    cwd: resolve(projectRoot, 'backend'), env, stdio: 'inherit',
  });
} else {
  const args = ['compose', '-f', 'compose.yaml', 'exec'];
  if (action !== 'shell') args.push('-T');
  // DB 환경변수는 로컬 셸이 아닌 MySQL 컨테이너 안에서 확장합니다.
  args.push('mysql', 'sh', '-c',
    'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --user="$MYSQL_USER" --database="$MYSQL_DATABASE" --default-character-set=utf8mb4');
  let sql;
  if (action === 'list') {
    sql = `SELECT p.place_id, p.name, p.address, p.homepage, p.publish_status, i.content_id
FROM tour_api_import i
JOIN place p ON p.place_id = i.place_id
ORDER BY p.place_id;\n`;
  } else if (action === 'publish-initial') {
    sql = readFileSync(resolve(projectRoot, 'backend/scripts/review-initial-tour-places.sql'), 'utf8');
  }
  result = spawnSync('docker', args, {
    cwd: projectRoot, env,
    stdio: action === 'shell' ? 'inherit' : ['pipe', 'inherit', 'inherit'],
    input: sql,
  });
}
if (result.error) {
  console.error('명령을 실행하지 못했습니다. Docker 또는 Java·Gradle 실행 환경을 확인하세요.');
}
process.exit(result.status ?? 1);
