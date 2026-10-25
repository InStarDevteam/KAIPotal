import { useEffect, useState } from 'react';
import Paper from '@material-ui/core/Paper';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import SearchIcon from '@material-ui/icons/Search';
import Autocomplete from '@material-ui/lab/Autocomplete';
import TextField from '@material-ui/core/TextField';
import { PortalSuggestItem } from './types';
import { searchTypeLabel, validateSearchQuery } from './SearchApiClient';

interface SearchBoxProps {
  value: string;
  onSearch: (query: string) => void;
  onSuggest?: (query: string) => Promise<PortalSuggestItem[]>;
}

export const SearchBox = ({ value, onSearch, onSuggest }: SearchBoxProps) => {
  const [input, setInput] = useState(value);
  const [options, setOptions] = useState<PortalSuggestItem[]>([]);
  useEffect(() => {
    setInput(value);
  }, [value]);
  useEffect(() => {
    let active = true;
    setOptions([]);
    if (!onSuggest || validateSearchQuery(input)) return undefined;
    const timer = setTimeout(() => {
      onSuggest(input.trim())
        .then(items => {
          if (active) setOptions(items);
        })
        .catch(() => {
          if (active) setOptions([]);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [input, onSuggest]);

  return (
    <Paper
      component="form"
      role="search"
      aria-label="포털 통합검색"
      onSubmit={event => {
        event.preventDefault();
        onSearch(input);
      }}
      style={{ display: 'flex', alignItems: 'center', padding: '4px 16px' }}
    >
      <Autocomplete
        freeSolo
        fullWidth
        options={options}
        getOptionLabel={option =>
          typeof option === 'string' ? option : option.title
        }
        filterOptions={items => items}
        inputValue={input}
        onInputChange={(_, next, reason) => {
          if (reason !== 'reset') setInput(next);
        }}
        onChange={(_, option) => {
          if (option) {
            const title = typeof option === 'string' ? option : option.title;
            setInput(title);
            onSearch(title);
          }
        }}
        renderOption={option =>
          typeof option === 'string' ? (
            <Typography variant="body2">{option}</Typography>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Typography variant="body2">{option.title}</Typography>
              <Typography variant="caption" color="textSecondary">
                {searchTypeLabel(option.type)}
              </Typography>
            </div>
          )
        }
        renderInput={params => (
          <TextField
            {...params}
            label="검색어"
            placeholder="포털 메뉴, 프로젝트, 조직, 사용자 (2자 이상)"
            inputProps={{ ...params.inputProps, maxLength: 100 }}
            InputProps={{ ...params.InputProps, disableUnderline: true }}
          />
        )}
      />
      <IconButton type="submit" aria-label="검색 실행">
        <SearchIcon />
      </IconButton>
    </Paper>
  );
};
