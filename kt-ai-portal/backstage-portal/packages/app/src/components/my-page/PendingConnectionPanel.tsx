import LinkOutlinedIcon from '@material-ui/icons/LinkOutlined';

const pendingDetails: Record<
  string,
  { title: string; description: string; features: string[] }
> = {
  '이메일 확인': {
    title: '기관 인증 시스템 연결이 필요합니다',
    description:
      '등록 이메일의 확인 상태와 변경 요청은 기관 인증 시스템에서 검증합니다.',
    features: ['이메일 확인 상태', '이메일 변경 요청 및 검증'],
  },
  '비밀번호 변경': {
    title: '비밀번호는 기관 인증 시스템에서 관리합니다',
    description:
      '기관 로그인 정책을 연결하면 비밀번호 변경과 만료 안내를 이용할 수 있습니다. 연결 전에는 비밀번호를 입력받지 않습니다.',
    features: ['비밀번호 변경', '비밀번호 정책·만료 안내'],
  },
  '자원 사용 이력': {
    title: '플랫폼 사용량 연결을 준비 중입니다',
    description:
      'AI·클라우드 플랫폼에서 전달받은 본인의 사용량과 과금 이력이 여기에 표시됩니다.',
    features: ['CPU·GPU·메모리 사용량', '프로젝트별 사용 기간 및 정산 이력'],
  },
  '알림 설정': {
    title: '알림 전달 채널 연결이 필요합니다',
    description:
      '신청 결과와 이용 기간 안내를 받을 수 있도록 포털·이메일 등 수신 채널을 연결합니다.',
    features: [
      '승인·반려 알림',
      '자원 만료·크레딧 잔액 알림',
      '개인 수신 설정',
    ],
  },
  '개인 API Key': {
    title: '개인 API 인증 연결을 준비 중입니다',
    description:
      '연결이 완료되면 허용된 서비스에 사용할 키의 발급·권한·만료·폐기를 관리할 수 있습니다.',
    features: [
      '개인 키 발급 및 폐기',
      '접근 서비스·권한 범위 설정',
      '만료일과 사용 이력 조회',
    ],
  },
};
export const PendingConnectionPanel = ({ title }: { title: string }) => {
  const detail = pendingDetails[title];
  return (
    <section className="my-panel">
      <div className="my-panel-heading">
        <div>
          <span className="my-eyebrow">MY ACCOUNT</span>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="my-empty my-connection">
        <LinkOutlinedIcon />
        <span className="my-status pending">연동 준비 중</span>
        <h3>{detail.title}</h3>
        <p>{detail.description}</p>
        <ul>
          {detail.features.map(feature => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>
    </section>
  );
};
