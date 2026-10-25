import React from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import { ResourceQuota } from './types';

export const ResourceQuotaCard = ({ quota }: { quota: ResourceQuota }) => {
  const rows = [
    { label: 'CPU Core', value: `${quota.cpuCores} vCore` },
    { label: 'GPU', value: `${quota.gpuCount} 개` },
    { label: 'Memory', value: `${quota.memoryGiB} GiB` },
    { label: 'Storage', value: `${quota.storageGiB} GiB` },
    { label: 'Network', value: `${quota.networkMbps} Mbps` },
    { label: '크레딧 사용', value: quota.usesCredit ? '예' : '아니오' },
  ];

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          리소스 할당량
        </Typography>
        {rows.map((row, index) => (
          <React.Fragment key={row.label}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
              }}
            >
              <Typography color="textSecondary" variant="body2">
                {row.label}
              </Typography>
              <Typography variant="body2">{row.value}</Typography>
            </div>
            {index < rows.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  );
};
