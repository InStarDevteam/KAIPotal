import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import { CreditAccountData, formatCreditAmount } from './creditServerData';

const formatDateTime = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleString('ko-KR') : '—';

export const CreditAccountCards = ({
  ownerLabel,
  data,
}: {
  ownerLabel: string;
  data: CreditAccountData;
}) => {
  let balanceLabel = '확인 불가';
  if (data.balanced !== null) {
    balanceLabel = data.balanced ? '정합' : '불일치(관리자 확인 필요)';
  }
  const items = [
    {
      label: '현재 잔액',
      value: `${formatCreditAmount(data.account.balance)} C`,
    },
    { label: '계정 대상', value: ownerLabel || '—' },
    {
      label: '최종 갱신',
      value: formatDateTime(data.account.updated_at),
    },
    {
      label: '원장 정합성',
      value: balanceLabel,
    },
  ];

  return (
    <Grid container spacing={2}>
      {items.map(item => (
        <Grid item xs={12} sm={6} md={3} key={item.label}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                {item.label}
              </Typography>
              <Typography variant="h6">{item.value}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
