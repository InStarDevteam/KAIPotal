import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { Tool } from './types';
import { ToolCategoryChip } from './ToolCategoryChip';
import { ToolStatusChip } from './ToolStatusChip';

interface ToolCatalogListProps {
  tools: Tool[];
  selectedTool: Tool | null;
  onSelect: (tool: Tool) => void;
}

export const ToolCatalogList = ({
  tools,
  selectedTool,
  onSelect,
}: ToolCatalogListProps) => {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>도구명</TableCell>
            <TableCell>카테고리</TableCell>
            <TableCell>제공 방식</TableCell>
            <TableCell>버전</TableCell>
            <TableCell>상태</TableCell>
            <TableCell>보안등급</TableCell>
            <TableCell>담당자</TableCell>
            <TableCell>등록일</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tools.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} align="center">
                <Box padding={2}>
                  <Typography color="textSecondary">
                    도구가 없습니다.
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}
          {tools.map(tool => (
            <TableRow
              key={tool.id}
              selected={selectedTool?.id === tool.id}
              onClick={() => onSelect(tool)}
              style={{ cursor: 'pointer' }}
            >
              <TableCell>{tool.id}</TableCell>
              <TableCell>{tool.name}</TableCell>
              <TableCell>
                <ToolCategoryChip category={tool.category} />
              </TableCell>
              <TableCell>{tool.provisionType}</TableCell>
              <TableCell>{tool.version}</TableCell>
              <TableCell>
                <ToolStatusChip status={tool.status} />
              </TableCell>
              <TableCell>{tool.securityLevel}</TableCell>
              <TableCell>{tool.owner}</TableCell>
              <TableCell>{tool.registeredAt}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
