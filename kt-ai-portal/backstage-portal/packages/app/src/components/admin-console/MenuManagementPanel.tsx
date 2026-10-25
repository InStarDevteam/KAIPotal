import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import { MenuTreePanel } from './MenuTreePanel';
import { MenuDetailPanel } from './MenuDetailPanel';
import { MenuPermissionPanel } from './MenuPermissionPanel';
import { ProgramRegistryPanel } from './ProgramRegistryPanel';
import { MenuItem as MenuItemType, Program } from './types';

interface MenuManagementPanelProps {
  menuItems: MenuItemType[];
  programs?: Program[];
}

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  if (value !== index) return null;
  return <Box marginTop={3}>{children}</Box>;
};

export const MenuManagementPanel = ({ menuItems, programs = [] }: MenuManagementPanelProps) => {
  const [tab, setTab] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(menuItems[0]?.id || null);

  const selectedItem = menuItems.find(m => m.id === selectedId);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
        <Typography variant="h6" style={{ fontWeight: 600 }}>
          메뉴 / 프로그램 관리
        </Typography>
        <Button variant="outlined" size="small" disabled>
          신규 메뉴 등록
        </Button>
      </Box>

      <Paper variant="outlined">
        <Tabs
          value={tab}
          onChange={(_, newValue) => setTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="메뉴 트리" />
          <Tab label="메뉴 상세" />
          <Tab label="메뉴 권한 연결" />
          <Tab label="프로그램 관리" />
        </Tabs>
      </Paper>

      <TabPanel value={tab} index={0}>
        <MenuTreePanel menuItems={menuItems} selectedId={selectedId} onSelect={setSelectedId} />
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <MenuTreePanel menuItems={menuItems} selectedId={selectedId} onSelect={setSelectedId} />
          </Grid>
          <Grid item xs={12} md={5}>
            {selectedItem ? <MenuDetailPanel item={selectedItem} menuItems={menuItems} /> : null}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <MenuPermissionPanel menuItems={menuItems} />
      </TabPanel>

      <TabPanel value={tab} index={3}>
        <ProgramRegistryPanel programs={programs} />
      </TabPanel>
    </Box>
  );
};
