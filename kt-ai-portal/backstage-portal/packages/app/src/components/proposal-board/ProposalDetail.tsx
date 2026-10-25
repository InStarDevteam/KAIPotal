import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import ThumbUpAltIcon from '@material-ui/icons/ThumbUpAlt';
import StarsIcon from '@material-ui/icons/Stars';
import FavoriteBorderIcon from '@material-ui/icons/FavoriteBorder';
import CommentIcon from '@material-ui/icons/Comment';
import { Proposal, ProposalReaction } from './types';
import { ProposalCategoryChip } from './ProposalCategoryChip';
import { ProposalStatusChip } from './ProposalStatusChip';

interface ProposalDetailProps {
  proposal: Proposal | null;
  onReaction?: (reaction: ProposalReaction) => void;
  onComment?: (content: string) => boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ProposalDetail = ({
  proposal,
  onReaction,
  onComment,
  onEdit,
  onDelete,
}: ProposalDetailProps) => {
  const liked = proposal?.myReactions?.includes('likes');
  const recommended = proposal?.myReactions?.includes('recommends');
  const interested = proposal?.myReactions?.includes('interests');
  const [comment, setComment] = useState('');

  if (!proposal) {
    return (
      <Paper variant="outlined" style={{ padding: 24, height: '100%' }}>
        <Typography color="textSecondary" align="center">
          목록에서 제안을 선택하세요.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" style={{ padding: 24, height: '100%' }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        marginBottom={2}
      >
        <Box
          display="flex"
          alignItems="center"
          style={{ gap: 8 }}
          flexWrap="wrap"
        >
          <Typography variant="h6" style={{ fontWeight: 600 }}>
            {proposal.title}
          </Typography>
          <ProposalCategoryChip category={proposal.category} />
          <ProposalStatusChip status={proposal.status} />
          {proposal.isNoticed && (
            <Chip size="small" label="공지" color="primary" />
          )}
        </Box>
      </Box>

      {(onEdit || onDelete) && (
        <Box mb={2} display="flex" gridGap={8}>
          {onEdit && (
            <Button size="small" variant="outlined" onClick={onEdit}>
              내 제안 수정
            </Button>
          )}
          {onDelete && (
            <Button size="small" color="secondary" onClick={onDelete}>
              내 제안 삭제
            </Button>
          )}
        </Box>
      )}
      <Divider style={{ marginBottom: 16 }} />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="textSecondary">
            제안자
          </Typography>
          <Typography variant="body2">
            {proposal.proposer} / {proposal.organization}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="textSecondary">
            연락처
          </Typography>
          <Typography variant="body2">
            {proposal.contact} / {proposal.email}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="textSecondary">
            보안등급
          </Typography>
          <Typography variant="body2">{proposal.securityLevel}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="textSecondary">
            공개 여부
          </Typography>
          <Typography variant="body2">
            {proposal.isPublic ? '공개' : '비공개'}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="caption" color="textSecondary">
            제안 배경/필요성
          </Typography>
          <Typography variant="body2">{proposal.necessity}</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="caption" color="textSecondary">
            활용 가능성
          </Typography>
          <Typography variant="body2">{proposal.applicability}</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="caption" color="textSecondary">
            기대효과
          </Typography>
          <Typography variant="body2">{proposal.expectedEffect}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="textSecondary">
            필요 데이터
          </Typography>
          <Typography variant="body2">{proposal.requiredData}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="textSecondary">
            예상 사용자
          </Typography>
          <Typography variant="body2">{proposal.expectedUsers}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="textSecondary">
            예상 업무효과
          </Typography>
          <Typography variant="body2">{proposal.expectedBenefit}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="textSecondary">
            관련 프로젝트
          </Typography>
          <Typography variant="body2">
            {proposal.relatedProjects.join(', ') || '-'}
          </Typography>
        </Grid>
      </Grid>

      <Divider style={{ margin: '16px 0' }} />

      <Box display="flex" flexWrap="wrap" style={{ gap: 8 }} marginBottom={2}>
        <Button
          size="small"
          variant={liked ? 'contained' : 'outlined'}
          color="primary"
          startIcon={<ThumbUpAltIcon />}
          disabled={!onReaction}
          onClick={() => onReaction?.('likes')}
        >
          좋아요 {proposal.likes}
        </Button>
        <Button
          size="small"
          variant={recommended ? 'contained' : 'outlined'}
          color="primary"
          startIcon={<StarsIcon />}
          disabled={!onReaction}
          onClick={() => onReaction?.('recommends')}
        >
          추천 {proposal.recommends}
        </Button>
        <Button
          size="small"
          variant={interested ? 'contained' : 'outlined'}
          color="primary"
          startIcon={<FavoriteBorderIcon />}
          disabled={!onReaction}
          onClick={() => onReaction?.('interests')}
        >
          관심 {proposal.interests}
        </Button>
      </Box>

      <Typography variant="subtitle2" gutterBottom>
        <CommentIcon fontSize="small" style={{ verticalAlign: 'middle' }} />{' '}
        댓글/의견
      </Typography>
      {proposal.comments.map(c => (
        <Box key={c.id} marginBottom={1}>
          <Typography variant="caption" color="textSecondary">
            {c.author} · {c.createdAt}
          </Typography>
          <Typography variant="body2">{c.content}</Typography>
        </Box>
      ))}
      <Box marginTop={1}>
        <TextField
          fullWidth
          size="small"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="댓글을 입력하세요"
          inputProps={{ maxLength: 2000, 'aria-label': '댓글 내용' }}
        />
        <Box marginTop={1}>
          <Button
            variant="outlined"
            size="small"
            disabled={!onComment || !comment.trim()}
            onClick={() => {
              if (onComment?.(comment)) setComment('');
            }}
          >
            댓글 작성
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};
