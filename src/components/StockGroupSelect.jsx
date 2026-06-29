import React from 'react';
import { Select, MenuItem, ListSubheader } from '@mui/material';
import { STOCK_GROUPS } from '../config/stocksConfig';

/**
 * Grouped stock dropdown used by StockPrice, StockRisk, and StockRiskColor.
 *
 * MUI Select only recognises direct MenuItem children, do NOT wrap options in
 * Fragment or other containers or the select will see zero valid values.
 */
const StockGroupSelect = ({
  value,
  onChange,
  label = 'Stock',
  labelId = 'stock-label',
  colors,
  sx = {},
}) => (
  <Select
    value={value}
    onChange={onChange}
    label={label}
    labelId={labelId}
    MenuProps={{
      // Prevent ListSubheader rows from stealing focus / blocking selection
      autoFocus: false,
    }}
    sx={{
      color: colors.grey[100],
      backgroundColor: colors.primary[500],
      borderRadius: '8px',
      '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
      '& .MuiSelect-select': { py: 1.5, pl: 2 },
      ...sx,
    }}
  >
    {STOCK_GROUPS.flatMap((group) => [
      <ListSubheader
        key={`header-${group.id}`}
        sx={{ color: colors.grey[400], lineHeight: '28px', pointerEvents: 'none' }}
      >
        {group.label}
      </ListSubheader>,
      ...group.stocks.map((stock) => (
        <MenuItem key={stock.value} value={stock.value}>
          {stock.label}
        </MenuItem>
      )),
    ])}
  </Select>
);

export default StockGroupSelect;