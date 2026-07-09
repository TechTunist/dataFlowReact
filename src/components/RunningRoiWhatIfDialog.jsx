// src/components/RunningRoiWhatIfDialog.jsx
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../theme';
import {
  calculateRunningRoiWhatIf,
  BITCOIN_1Y_ROI_CYCLE_PEAKS,
} from '../utility/runningRoiUtils';

const ROI_SERIES_COLOR = '#ff0062';

function formatPrice(value) {
  if (value == null || !Number.isFinite(value)) return 'n/a';
  if (value >= 1000) {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  if (value >= 1) {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
}

function formatRoi(value) {
  if (value == null || !Number.isFinite(value)) return 'n/a';
  return `${value.toFixed(2)}×`;
}

function formatRisk(value) {
  if (value == null || !Number.isFinite(value)) return 'n/a';
  return value.toFixed(3);
}

function formatDateDisplay(isoDate) {
  if (!isoDate) return 'n/a';
  return isoDate.split('-').reverse().join('-');
}

/**
 * What-if calculator dialog for Running ROI Risk.
 * Primary output is ROI risk (0-1); raw 1Y ROI and price are secondary.
 */
const RunningRoiWhatIfDialog = ({
  open,
  onClose,
  priceData = [],
  roiData = null,
  assetLabel = 'Asset',
  assetSymbol = 'BTC',
  defaultDate = null,
  defaultPrice = null,
}) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isDark = theme.palette.mode === 'dark';

  const [mode, setMode] = useState('price');
  const [date, setDate] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [roiInput, setRoiInput] = useState('1.0');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const peaks = assetSymbol === 'BTC' ? BITCOIN_1Y_ROI_CYCLE_PEAKS : null;

  const latestPriceDate = priceData.length > 0 ? priceData[priceData.length - 1].time : null;
  const latestPrice = priceData.length > 0 ? priceData[priceData.length - 1].value : null;

  // Seed form when dialog opens
  useEffect(() => {
    if (!open) return;
    const seedDate = defaultDate || latestPriceDate || '';
    const seedPrice = defaultPrice ?? latestPrice;
    setDate(seedDate);
    setPriceInput(seedPrice != null && Number.isFinite(seedPrice) ? String(Math.round(seedPrice)) : '');
    setRoiInput('1.0');
    setMode('price');
    setResult(null);
    setError(null);
  }, [open, defaultDate, defaultPrice, latestPriceDate, latestPrice]);

  const handleModeChange = useCallback((_, next) => {
    if (next != null) {
      setMode(next);
      setResult(null);
      setError(null);
    }
  }, []);

  const handleCalculate = useCallback(() => {
    const payload = calculateRunningRoiWhatIf({
      priceData,
      roiData,
      date,
      mode,
      targetPrice: mode === 'price' ? Number(priceInput) : undefined,
      targetRoi: mode === 'roi' ? Number(roiInput) : undefined,
      peaks,
    });

    if (!payload.ok) {
      setResult(null);
      setError(payload.error || 'Could not calculate scenario.');
      return;
    }
    setError(null);
    setResult(payload);
  }, [priceData, roiData, date, mode, priceInput, roiInput, peaks]);

  const paperSx = {
    backgroundColor: colors.primary[500],
    color: colors.grey[100],
    backgroundImage: 'none',
    maxWidth: 560,
    width: '100%',
  };

  const fieldSx = {
    '& .MuiInputLabel-root': { color: colors.grey[300] },
    '& .MuiInputLabel-root.Mui-focused': { color: colors.greenAccent[500] },
    '& .MuiOutlinedInput-root': {
      color: colors.grey[100],
      backgroundColor: colors.primary[600],
      '& fieldset': { borderColor: colors.grey[600] },
      '&:hover fieldset': { borderColor: colors.greenAccent[500] },
      '&.Mui-focused fieldset': { borderColor: colors.greenAccent[500] },
    },
    '& input::-webkit-calendar-picker-indicator': {
      filter: isDark ? 'invert(1)' : 'none',
    },
  };

  const tableHeadCellSx = {
    color: colors.grey[300],
    borderColor: colors.grey[700],
    fontWeight: 600,
    py: 1,
    fontSize: '0.75rem',
  };

  const tableBodyCellSx = {
    color: colors.grey[100],
    borderColor: colors.grey[700],
    py: 0.85,
    fontSize: '0.8125rem',
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: paperSx }}
    >
      <DialogTitle sx={{ color: colors.grey[100], pb: 1 }}>
        What-if: 1Y ROI risk
        <Typography variant="body2" sx={{ color: colors.grey[400], mt: 0.5, fontWeight: 400 }}>
          {assetLabel} — hypothetical price or ROI on a date → risk score (0–1)
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            size="small"
            fullWidth
            sx={{
              backgroundColor: colors.primary[600],
              '& .MuiToggleButton-root': {
                color: colors.grey[100],
                borderColor: colors.grey[600],
                textTransform: 'none',
                flex: 1,
                '&.Mui-selected': {
                  backgroundColor: colors.greenAccent[500],
                  color: colors.primary[900],
                  fontWeight: 600,
                },
                '&.Mui-selected:hover': {
                  backgroundColor: colors.greenAccent[600],
                },
              },
            }}
          >
            <ToggleButton value="price">Price → risk</ToggleButton>
            <ToggleButton value="roi">ROI → price / risk</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label="Scenario date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setResult(null);
            }}
            InputLabelProps={{ shrink: true }}
            size="small"
            fullWidth
            sx={fieldSx}
          />

          {mode === 'price' ? (
            <TextField
              label={`Hypothetical price (USD)`}
              type="number"
              value={priceInput}
              onChange={(e) => {
                setPriceInput(e.target.value);
                setResult(null);
              }}
              inputProps={{ min: 0, step: 'any' }}
              size="small"
              fullWidth
              sx={fieldSx}
              helperText="What price do you want to test on that date?"
              FormHelperTextProps={{ sx: { color: colors.grey[400] } }}
            />
          ) : (
            <TextField
              label="Target 1Y ROI (multiplier)"
              type="number"
              value={roiInput}
              onChange={(e) => {
                setRoiInput(e.target.value);
                setResult(null);
              }}
              inputProps={{ min: 0, step: 0.05 }}
              size="small"
              fullWidth
              sx={fieldSx}
              helperText="1.0 = flat, 2.0 = doubled over the prior year"
              FormHelperTextProps={{ sx: { color: colors.grey[400] } }}
            />
          )}

          {error && (
            <Typography variant="body2" sx={{ color: colors.redAccent[400] }}>
              {error}
            </Typography>
          )}

          {result?.ok && result.center && (
            <Box
              sx={{
                p: 1.75,
                borderRadius: '8px',
                backgroundColor: colors.primary[600],
                border: `1px solid ${colors.grey[700]}`,
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: colors.grey[400], display: 'block', mb: 0.5, letterSpacing: 0.4 }}
              >
                SCENARIO RESULT · {formatDateDisplay(result.date)}
              </Typography>

              <Typography
                variant="h4"
                sx={{
                  color: ROI_SERIES_COLOR,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  mb: 0.75,
                }}
              >
                Risk {formatRisk(result.center.riskScore)}
              </Typography>

              <Typography variant="body2" sx={{ color: colors.grey[200] }}>
                1Y ROI{' '}
                <Box component="span" sx={{ color: colors.grey[100], fontWeight: 600 }}>
                  {formatRoi(result.center.rawRoi)}
                </Box>
                {' · '}
                Price{' '}
                <Box component="span" sx={{ color: colors.grey[100], fontWeight: 600 }}>
                  {formatPrice(result.center.price)}
                </Box>
              </Typography>

              <Typography variant="caption" sx={{ color: colors.grey[400], display: 'block', mt: 1 }}>
                Lookback price {formatPrice(result.lookback.price)} on{' '}
                {formatDateDisplay(result.lookback.time)} (≈{result.lookbackDays}d window).
                Illustrative only — not a forecast.
              </Typography>
            </Box>
          )}

          {result?.ok && result.rows?.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ color: colors.grey[200], mb: 0.75 }}>
                Nearby scenarios
              </Typography>
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  backgroundColor: colors.primary[600],
                  border: `1px solid ${colors.grey[700]}`,
                  borderRadius: '8px',
                  maxHeight: 280,
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...tableHeadCellSx, backgroundColor: colors.primary[700] }}>
                        Scenario
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ ...tableHeadCellSx, backgroundColor: colors.primary[700] }}
                      >
                        Risk
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ ...tableHeadCellSx, backgroundColor: colors.primary[700] }}
                      >
                        1Y ROI
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ ...tableHeadCellSx, backgroundColor: colors.primary[700] }}
                      >
                        Price
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.rows.map((row) => (
                      <TableRow
                        key={`${row.offsetLabel}-${row.price}`}
                        sx={{
                          backgroundColor: row.isTarget
                            ? (isDark ? 'rgba(255, 0, 98, 0.12)' : 'rgba(255, 0, 98, 0.08)')
                            : 'transparent',
                          '&:last-child td': { borderBottom: 0 },
                        }}
                      >
                        <TableCell sx={tableBodyCellSx}>
                          {row.isTarget ? (
                            <Box component="span" sx={{ fontWeight: 700, color: ROI_SERIES_COLOR }}>
                              {row.offsetLabel}
                            </Box>
                          ) : (
                            row.offsetLabel
                          )}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            ...tableBodyCellSx,
                            fontWeight: row.isTarget ? 700 : 500,
                            color: row.isTarget ? ROI_SERIES_COLOR : colors.grey[100],
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatRisk(row.riskScore)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            ...tableBodyCellSx,
                            color: colors.grey[300],
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatRoi(row.rawRoi)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            ...tableBodyCellSx,
                            color: colors.grey[300],
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatPrice(row.price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{ color: colors.grey[300], textTransform: 'none' }}
        >
          Close
        </Button>
        <Button
          variant="contained"
          onClick={handleCalculate}
          disabled={!date || (mode === 'price' ? !priceInput : !roiInput)}
          sx={{
            backgroundColor: colors.greenAccent[500],
            color: colors.primary[900],
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { backgroundColor: colors.greenAccent[600] },
            '&.Mui-disabled': {
              backgroundColor: colors.grey[700],
              color: colors.grey[500],
            },
          }}
        >
          Calculate
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RunningRoiWhatIfDialog;
