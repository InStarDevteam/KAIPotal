import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import { Link } from 'react-router-dom';
import { SectionCard, colors, layoutTokens } from '../common';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import SearchIcon from '@material-ui/icons/Search';
import WorkIcon from '@material-ui/icons/Work';
import SwapHorizIcon from '@material-ui/icons/SwapHoriz';
import AccountBalanceIcon from '@material-ui/icons/AccountBalance';
import StorageIcon from '@material-ui/icons/Storage';
import DashboardIcon from '@material-ui/icons/Dashboard';
import VpnKeyIcon from '@material-ui/icons/VpnKey';
import SupervisorAccountIcon from '@material-ui/icons/SupervisorAccount';
import AppsIcon from '@material-ui/icons/Apps';
import ExtensionIcon from '@material-ui/icons/Extension';
import AccountTreeIcon from '@material-ui/icons/AccountTree';
import HomeIcon from '@material-ui/icons/Home';
import PersonIcon from '@material-ui/icons/Person';
import SettingsIcon from '@material-ui/icons/Settings';
import { QuickLink } from './types';
import { portalMenuDefinitions } from '../navigation/portalMenuDefinitions';

interface QuickLinkCardsProps {
  links: QuickLink[];
}

const iconMap: Record<string, React.ReactNode> = {
  'ql-dashboard': <HomeIcon />,
  'ql-admin': <SupervisorAccountIcon />,
  'ql-service-catalog': <AppsIcon />,
  'ql-export': <SwapHorizIcon />,
  'ql-search': <SearchIcon />,
  'ql-project': <WorkIcon />,
  'ql-credit': <AccountBalanceIcon />,
  'ql-my-page': <PersonIcon />,
  'ql-environment': <SettingsIcon />,
  'ql-tenant': <AccountTreeIcon />,
  'ql-proposal': <ExtensionIcon />,
  'ql-openmetadata': <StorageIcon />,
  'ql-opensearch': <DashboardIcon />,
  'ql-keycloak': <VpnKeyIcon />,
};

const QuickLinkIcon = ({ link }: { link: QuickLink }) => {
  const Icon = portalMenuDefinitions.find(
    menu => menu.route === link.target,
  )?.icon;
  return Icon ? <Icon /> : <>{iconMap[link.id]}</>;
};

const BoxContent = ({ link }: { link: QuickLink }) => (
  <>
    <Box display="flex" alignItems="center" marginBottom={1}>
      <Box marginRight={1} color="primary.main">
        <QuickLinkIcon link={link} />
      </Box>
      <Typography variant="subtitle2" style={{ fontWeight: 600, flex: 1 }}>
        {link.title}
      </Typography>
      {link.type === 'external' && (
        <OpenInNewIcon fontSize="small" color="action" />
      )}
    </Box>
    <Typography variant="caption" color="textSecondary">
      {link.description}
    </Typography>
  </>
);

export const QuickLinkCards = ({ links }: QuickLinkCardsProps) => {
  return (
    <SectionCard title="바로가기" compact>
      <Grid container spacing={2}>
        {links.map(link => (
          <Grid item xs={6} key={link.id}>
            <Card
              variant="outlined"
              style={{
                height: '100%',
                transition: 'all 0.2s',
                borderColor: colors.border,
                borderRadius: layoutTokens.cardRadius,
              }}
            >
              <CardContent style={{ padding: 16 }}>
                {link.type === 'internal' ? (
                  <Link
                    to={link.target}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <BoxContent link={link} />
                  </Link>
                ) : (
                  <a
                    href={link.target}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <BoxContent link={link} />
                  </a>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </SectionCard>
  );
};
