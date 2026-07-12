import React, { useEffect, useMemo, useState, useRef } from 'react';
import { tokens } from "../theme";
import {
  useTheme,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  Tooltip,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
  Checkbox,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import ChartInfoSections from './ChartInfoSections';
import { useChartData, useChartDataActions } from '../hooks/useChartData';

/**
 * Known BTC halving calendar years. Cycle phases for a year Y use offset from the
 * most recent halving year ≤ Y:
 *   0 = halving year, 1 = post-halving, 2 = midterm, 3 = pre-halving
 */
const HALVING_YEARS = [2012, 2016, 2020, 2024, 2028, 2032];

const PHASE_ORDER = ['pre-halving', 'halving', 'post-halving', 'midterm'];

const PHASE_META = {
  'pre-halving': { id: 'pre-halving', label: 'Pre-halving', short: 'pre-halving' },
  halving: { id: 'halving', label: 'Halving year', short: 'halving' },
  'post-halving': { id: 'post-halving', label: 'Post-halving', short: 'post-halving' },
  midterm: { id: 'midterm', label: 'Midterm', short: 'midterm' },
};

export function cyclePhaseForYear(year) {
  const y = Number(year);
  if (!Number.isFinite(y)) return null;
  let prev = null;
  for (const h of HALVING_YEARS) {
    if (h <= y) prev = h;
    else break;
  }
  if (prev == null) {
    if (y === 2011) return 'pre-halving';
    if (y === 2010) return 'midterm';
    return 'pre-halving';
  }
  const offset = y - prev;
  if (offset === 0) return 'halving';
  if (offset === 1) return 'post-halving';
  if (offset === 2) return 'midterm';
  if (offset === 3) return 'pre-halving';
  return 'pre-halving';
}

function phaseLabel(phase) {
  return PHASE_META[phase]?.label || phase;
}

function yearDisplayLabel(year) {
  const phase = cyclePhaseForYear(year);
  return `${year} — ${phaseLabel(phase)}`;
}

function yearsMatchingOneFilter(allYears, filterKey) {
  if (!filterKey || filterKey === 'all') return allYears;
  if (filterKey.startsWith('phase:')) {
    const phase = filterKey.slice('phase:'.length);
    return allYears.filter((y) => cyclePhaseForYear(y) === phase);
  }
  if (filterKey.startsWith('year:')) {
    const y = filterKey.slice('year:'.length);
    return allYears.filter((yr) => String(yr) === String(y));
  }
  if (/^\d{4}$/.test(filterKey)) {
    const min = parseInt(filterKey, 10);
    return allYears.filter((y) => parseInt(y, 10) >= min);
  }
  return [];
}

function yearsMatchingFilters(allYears, filterKeys) {
  if (!filterKeys?.length || filterKeys.includes('all')) return allYears;
  const wanted = new Set();
  filterKeys.forEach((key) => {
    yearsMatchingOneFilter(allYears, key).forEach((y) => wanted.add(String(y)));
  });
  return allYears.filter((y) => wanted.has(String(y)));
}

function filterDescription(filterKeys) {
  const keys = Array.isArray(filterKeys) ? filterKeys : [filterKeys];
  if (!keys.length || keys.includes('all')) return 'all available years';
  const phases = keys.filter((k) => k.startsWith('phase:')).map((k) => phaseLabel(k.slice(6)).toLowerCase());
  const years = keys
    .filter((k) => k.startsWith('year:'))
    .map((k) => k.slice(5))
    .sort((a, b) => Number(b) - Number(a));
  const parts = [];
  if (phases.length) parts.push(phases.map((p) => `${p} years`).join(', '));
  if (years.length) {
    parts.push(years.length <= 4 ? years.join(', ') : `${years.length} individual years`);
  }
  return parts.join(' + ') || 'selected years';
}

function optionLabel(value, filterOptions) {
  if (value === 'all') return 'All years';
  const phase = filterOptions?.phases?.find((p) => p.value === value);
  if (phase) return phase.label;
  const year = filterOptions?.individual?.find((p) => p.value === value);
  if (year) return year.label;
  if (value.startsWith('year:')) return yearDisplayLabel(value.slice(5));
  if (value.startsWith('phase:')) return phaseLabel(value.slice(6));
  return value;
}

function returnBgColor(num, colors) {
  if (num == null || Number.isNaN(num)) return colors.primary[700];
  if (num > 0) return '#28822d';
  if (num < 0) return '#9c4f4f';
  return colors.primary[700];
}

const selectControlSx = (colors) => ({
  color: colors.grey[100],
  backgroundColor: colors.primary[500],
  borderRadius: '8px',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
  '& .MuiSelect-select': { py: 1.5, pl: 2 },
});

const labelSx = (colors) => ({
  color: colors.grey[100],
  '&.Mui-focused': { color: colors.greenAccent[500] },
  top: 0,
  '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
});

const toggleSx = (colors) => ({
  backgroundColor: colors.primary[500],
  borderColor: colors.grey[300],
  '& .MuiToggleButton-root': {
    color: colors.grey[100],
    borderColor: colors.grey[300],
    textTransform: 'none',
    px: 2,
    py: 1,
    '&.Mui-selected': {
      backgroundColor: colors.greenAccent[700],
      color: colors.grey[100],
      '&:hover': { backgroundColor: colors.greenAccent[600] },
    },
    '&:hover': { backgroundColor: colors.primary[400] },
  },
});

/**
 * Build year → 12 monthly return numbers (or null) for all years in range.
 */
function computeAllYearMonthlyReturns(btcData, dataYearRange) {
  if (!btcData?.length) {
    return { allYearsNewestFirst: [], returnsByYear: {}, monthLabels: null };
  }

  const sortedBtcData = [...btcData].sort((a, b) => new Date(a.time) - new Date(b.time));
  const dataByYearMonth = sortedBtcData.reduce((acc, item) => {
    const date = new Date(item.time);
    const year = date.getFullYear();
    const month = date.getMonth();
    if (!acc[year]) acc[year] = {};
    if (!acc[year][month]) acc[year][month] = [];
    acc[year][month].push({ date, value: item.value });
    return acc;
  }, {});

  const getPreviousMonthClose = (year, month) => {
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear--;
    }
    const prevMonthData = dataByYearMonth[prevYear]?.[prevMonth];
    if (prevMonthData && prevMonthData.length > 0) {
      prevMonthData.sort((a, b) => a.date - b.date);
      return prevMonthData[prevMonthData.length - 1].value;
    }
    return null;
  };

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const { minYear, maxYear } = dataYearRange;

  const allYearsNewestFirst = [];
  for (let y = maxYear; y >= minYear; y--) allYearsNewestFirst.push(y.toString());

  const returnsByYear = {};
  allYearsNewestFirst.forEach((year) => {
    const yearReturns = [];
    for (let month = 0; month < 12; month++) {
      if (parseInt(year, 10) === 2010 && month < 7) {
        yearReturns.push(null);
        continue;
      }
      if (parseInt(year, 10) === currentYear && month > currentMonth) {
        yearReturns.push(null);
        continue;
      }
      const monthData = dataByYearMonth[year]?.[month];
      if (!monthData || monthData.length === 0) {
        yearReturns.push(null);
        continue;
      }
      monthData.sort((a, b) => a.date - b.date);
      const lastPrice = monthData[monthData.length - 1].value;
      let firstPrice = getPreviousMonthClose(parseInt(year, 10), month);
      if (firstPrice === null) firstPrice = monthData[0].value;
      const monthlyReturn = firstPrice !== 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
      const isOngoing = parseInt(year, 10) === currentYear && month === currentMonth;
      yearReturns.push({
        value: monthlyReturn,
        display: isOngoing ? `${monthlyReturn.toFixed(1)}*` : monthlyReturn.toFixed(1),
        ongoing: isOngoing,
      });
    }
    returnsByYear[year] = yearReturns;
  });

  return { allYearsNewestFirst, returnsByYear };
}

const BitcoinMonthlyReturnsTable = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const { btcData } = useChartData();
  const { fetchBtcData } = useChartDataActions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  /** 'years' | 'phase' */
  const [analysisView, setAnalysisView] = useState('years');
  /** Multi-select filter keys: 'all' | 'phase:…' | 'year:YYYY' */
  const [yearFilters, setYearFilters] = useState(['all']);
  const tableRef = useRef(null);

  const handleYearFiltersChange = (event) => {
    const raw = event.target.value;
    let next = typeof raw === 'string' ? raw.split(',') : [...raw];
    const prev = yearFilters;

    if (next.includes('all') && !prev.includes('all')) {
      setYearFilters(['all']);
      return;
    }
    next = next.filter((v) => v !== 'all');
    if (next.length === 0) {
      setYearFilters(['all']);
      return;
    }
    setYearFilters(next);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await fetchBtcData();
      } catch (err) {
        setError('Error fetching data. Please try again later.');
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchBtcData]);

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.style.width = '100%';
    }
  }, [isMobile, analysisView]);

  const dataYearRange = useMemo(() => {
    if (!btcData?.length) {
      const cy = new Date().getFullYear();
      return { minYear: 2010, maxYear: cy };
    }
    let min = Infinity;
    let max = -Infinity;
    btcData.forEach((item) => {
      const y = new Date(item.time).getFullYear();
      if (y < min) min = y;
      if (y > max) max = y;
    });
    if (!Number.isFinite(min)) min = 2010;
    if (!Number.isFinite(max)) max = new Date().getFullYear();
    return { minYear: min, maxYear: max };
  }, [btcData]);

  const filterOptions = useMemo(() => {
    const { minYear, maxYear } = dataYearRange;
    const individual = [];
    for (let y = maxYear; y >= minYear; y--) {
      individual.push({
        value: `year:${y}`,
        label: yearDisplayLabel(y),
      });
    }
    return {
      phases: [
        { value: 'phase:pre-halving', label: 'All pre-halving years' },
        { value: 'phase:halving', label: 'All halving years' },
        { value: 'phase:post-halving', label: 'All post-halving years' },
        { value: 'phase:midterm', label: 'All midterm years' },
      ],
      individual,
    };
  }, [dataYearRange]);

  const monthLabels = useMemo(
    () =>
      isMobile
        ? ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    [isMobile]
  );

  const { allYearsNewestFirst, returnsByYear } = useMemo(
    () => computeAllYearMonthlyReturns(btcData, dataYearRange),
    [btcData, dataYearRange]
  );

  // --- Years view (filtered year rows) ---
  const yearsViewData = useMemo(() => {
    const years = yearsMatchingFilters(allYearsNewestFirst, yearFilters);
    const yearPhases = {};
    years.forEach((y) => {
      yearPhases[y] = cyclePhaseForYear(y);
    });

    const returns = years.map((year) => {
      const cells = returnsByYear[year] || Array(12).fill(null);
      return cells.map((c) => (c == null ? null : c.display));
    });

    const averages = [];
    for (let month = 0; month < 12; month++) {
      let sum = 0;
      let count = 0;
      years.forEach((year) => {
        const cell = returnsByYear[year]?.[month];
        if (cell && Number.isFinite(cell.value)) {
          sum += cell.value;
          count += 1;
        }
      });
      averages.push(count > 0 ? (sum / count).toFixed(1) : null);
    }

    return { years, yearPhases, returns, averages };
  }, [allYearsNewestFirst, returnsByYear, yearFilters]);

  // --- Phase comparison matrix: month × phase ---
  const phaseMatrix = useMemo(() => {
    const phaseYears = {};
    PHASE_ORDER.forEach((p) => {
      phaseYears[p] = [];
    });
    allYearsNewestFirst.forEach((y) => {
      const phase = cyclePhaseForYear(y);
      if (phase && phaseYears[phase]) phaseYears[phase].push(y);
    });

    // matrix[monthIndex][phase] = { avg, count, yearsUsed }
    const matrix = Array.from({ length: 12 }, () => ({}));
    PHASE_ORDER.forEach((phase) => {
      const ys = phaseYears[phase];
      for (let m = 0; m < 12; m++) {
        let sum = 0;
        let count = 0;
        const yearsUsed = [];
        ys.forEach((year) => {
          const cell = returnsByYear[year]?.[m];
          if (cell && Number.isFinite(cell.value)) {
            sum += cell.value;
            count += 1;
            yearsUsed.push(year);
          }
        });
        matrix[m][phase] = {
          avg: count > 0 ? sum / count : null,
          count,
          yearsUsed,
        };
      }
    });

    const sampleSizes = {};
    PHASE_ORDER.forEach((phase) => {
      sampleSizes[phase] = phaseYears[phase].length;
    });

    return { matrix, sampleSizes, phaseYears };
  }, [allYearsNewestFirst, returnsByYear]);

  const averageRowLabel = useMemo(() => {
    if (yearFilters.includes('all') || yearFilters.length === 0) return 'Average';
    if (yearFilters.length === 1 && yearFilters[0].startsWith('phase:')) {
      return `Avg · ${phaseLabel(yearFilters[0].slice(6))}`;
    }
    if (yearFilters.every((k) => k.startsWith('year:'))) {
      if (yearFilters.length === 1) return `Avg · ${yearFilters[0].slice(5)}`;
      return `Avg · ${yearFilters.length} years`;
    }
    return 'Avg · selection';
  }, [yearFilters]);

  const tableSx = {
    maxHeight: isMobile ? 400 : 'none',
    overflow: 'auto',
    border: '2px solid #a9a9a9',
    minHeight: isDashboard ? '100%' : 600,
    width: '100%',
    '& .MuiTableCell-root': {
      padding: isMobile ? '4px' : '8px',
      fontSize: isMobile ? '0.75rem' : '0.875rem',
      textAlign: 'center',
      whiteSpace: 'nowrap',
    },
    '& .MuiTableCell-root:first-of-type': isMobile
      ? {
          position: 'sticky',
          left: 0,
          zIndex: 2,
          backgroundColor: colors.primary[700],
        }
      : undefined,
  };

  const headerCellSx = {
    backgroundColor: colors.primary[700],
    color: colors.primary[100],
  };

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '16px',
            marginTop: '20px',
            flexDirection: { xs: 'column', sm: 'row' },
            flexWrap: 'wrap',
            width: '100%',
            px: { xs: 1, sm: 0 },
          }}
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            value={analysisView}
            onChange={(_e, next) => {
              if (next != null) setAnalysisView(next);
            }}
            sx={toggleSx(colors)}
          >
            <ToggleButton value="years">Years</ToggleButton>
            <ToggleButton value="phase">Phase comparison</ToggleButton>
          </ToggleButtonGroup>

          {analysisView === 'years' && (
            <FormControl sx={{ minWidth: '150px', width: { xs: '100%', sm: '360px' } }}>
              <InputLabel
                id="monthly-returns-year-filter-label"
                shrink
                sx={labelSx(colors)}
              >
                Years
              </InputLabel>
              <Select
                multiple
                value={yearFilters}
                onChange={handleYearFiltersChange}
                label="Years"
                labelId="monthly-returns-year-filter-label"
                sx={selectControlSx(colors)}
                renderValue={(selected) => {
                  if (!selected?.length || selected.includes('all')) return 'All years';
                  if (selected.length === 1) return optionLabel(selected[0], filterOptions);
                  return `${selected.length} selected`;
                }}
                MenuProps={{
                  autoFocus: false,
                  PaperProps: {
                    sx: {
                      maxHeight: 420,
                      backgroundColor: colors.primary[500],
                      color: colors.grey[100],
                    },
                  },
                }}
              >
                <MenuItem value="all">
                  <Checkbox
                    checked={yearFilters.includes('all')}
                    sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                  />
                  <ListItemText primary="All years" />
                </MenuItem>
                <ListSubheader
                  sx={{
                    backgroundColor: colors.primary[600],
                    color: colors.greenAccent[400],
                    lineHeight: '36px',
                  }}
                >
                  Cycle phases (add all matching years)
                </ListSubheader>
                {filterOptions.phases.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Checkbox
                      checked={yearFilters.includes(opt.value)}
                      sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                    />
                    <ListItemText primary={opt.label} />
                  </MenuItem>
                ))}
                <ListSubheader
                  sx={{
                    backgroundColor: colors.primary[600],
                    color: colors.greenAccent[400],
                    lineHeight: '36px',
                  }}
                >
                  Individual years (multi-select)
                </ListSubheader>
                {filterOptions.individual.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Checkbox
                      checked={yearFilters.includes(opt.value)}
                      sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                    />
                    <ListItemText primary={opt.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {analysisView === 'phase' && (
            <Box
              sx={{
                color: colors.grey[300],
                fontSize: isMobile ? '0.75rem' : '0.85rem',
                maxWidth: 420,
                textAlign: { xs: 'center', sm: 'left' },
              }}
            >
              Average return for each month across all years in that cycle phase
            </Box>
          )}

          {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
          {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
        </Box>
      )}

      {analysisView === 'years' ? (
        <TableContainer
          component={Paper}
          ref={tableRef}
          className={isMobile ? 'mobile-scroll-table' : undefined}
          sx={tableSx}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headerCellSx, minWidth: isMobile ? 90 : 130 }}>
                  Year
                </TableCell>
                {monthLabels.map((month) => (
                  <TableCell
                    key={month}
                    sx={{
                      ...headerCellSx,
                      minWidth: isMobile ? 40 : 60,
                      width: `${100 / (monthLabels.length + 1)}%`,
                    }}
                  >
                    {month}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {yearsViewData.years.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={monthLabels.length + 1}
                    sx={{ backgroundColor: colors.primary[700], color: colors.grey[100] }}
                  >
                    No years match this filter.
                  </TableCell>
                </TableRow>
              ) : (
                yearsViewData.years.map((year, yIdx) => {
                  const phase = yearsViewData.yearPhases?.[year];
                  const phaseShort = PHASE_META[phase]?.short || '';
                  return (
                    <TableRow key={year}>
                      <TableCell
                        sx={{
                          backgroundColor: colors.primary[700],
                          color: colors.primary[100],
                          textAlign: 'left',
                          pl: isMobile ? 1 : 1.5,
                        }}
                      >
                        <div style={{ lineHeight: 1.2 }}>
                          <div>{year}</div>
                          {!isMobile && phaseShort && (
                            <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>{phaseShort}</div>
                          )}
                        </div>
                      </TableCell>
                      {monthLabels.map((month, mIdx) => {
                        const value = yearsViewData.returns[yIdx][mIdx];
                        if (value === null) return <TableCell key={mIdx} />;
                        const num = parseFloat(String(value).replace('*', ''));
                        const bgColor = returnBgColor(num, colors);
                        const tooltipTitle = `Return for ${monthLabels[mIdx]} ${year} (${phaseShort}): ${value}%${String(value).includes('*') ? ' (ongoing)' : ''}`;
                        return (
                          <Tooltip
                            key={mIdx}
                            title={tooltipTitle}
                            enterDelay={isMobile ? 0 : 300}
                            enterTouchDelay={0}
                            PopperProps={{
                              sx: {
                                '& .MuiTooltip-tooltip': {
                                  fontSize: '1rem',
                                  padding: '8px 12px',
                                },
                              },
                            }}
                          >
                            <TableCell sx={{ backgroundColor: bgColor }}>
                              <span>{value}</span>
                            </TableCell>
                          </Tooltip>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={monthLabels.length + 1} sx={{ height: '8px', backgroundColor: colors.primary[700], padding: 0 }} />
              </TableRow>
              <TableRow>
                <TableCell
                  sx={{
                    backgroundColor: colors.primary[700],
                    color: colors.primary[100],
                    textAlign: 'left',
                    pl: isMobile ? 1 : 1.5,
                    fontSize: isMobile ? '0.7rem' : '0.8rem',
                  }}
                >
                  {averageRowLabel}
                </TableCell>
                {yearsViewData.averages.map((avg, idx) => {
                  if (avg === null) return <TableCell key={idx} />;
                  const num = parseFloat(avg);
                  const bgColor = returnBgColor(num, colors);
                  const tooltipTitle = `${averageRowLabel} for ${monthLabels[idx]}: ${avg}% (${yearsViewData.years.length} year${yearsViewData.years.length === 1 ? '' : 's'})`;
                  return (
                    <Tooltip
                      key={idx}
                      title={tooltipTitle}
                      enterDelay={isMobile ? 0 : 300}
                      enterTouchDelay={0}
                      PopperProps={{
                        sx: {
                          '& .MuiTooltip-tooltip': {
                            fontSize: '1rem',
                            padding: '8px 12px',
                          },
                        },
                      }}
                    >
                      <TableCell sx={{ backgroundColor: bgColor }}>
                        {`${avg}%`}
                      </TableCell>
                    </Tooltip>
                  );
                })}
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      ) : (
        <TableContainer
          component={Paper}
          ref={tableRef}
          className={isMobile ? 'mobile-scroll-table' : undefined}
          sx={tableSx}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headerCellSx, minWidth: isMobile ? 48 : 72, textAlign: 'left' }}>
                  Month
                </TableCell>
                {PHASE_ORDER.map((phase) => (
                  <TableCell
                    key={phase}
                    sx={{
                      ...headerCellSx,
                      minWidth: isMobile ? 56 : 90,
                      width: `${100 / (PHASE_ORDER.length + 1)}%`,
                    }}
                  >
                    {isMobile ? PHASE_META[phase].short : PHASE_META[phase].label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {monthLabels.map((monthLabel, mIdx) => (
                <TableRow key={monthLabel}>
                  <TableCell
                    sx={{
                      backgroundColor: colors.primary[700],
                      color: colors.primary[100],
                      textAlign: 'left',
                      pl: isMobile ? 1 : 1.5,
                      fontWeight: 600,
                    }}
                  >
                    {monthLabel}
                  </TableCell>
                  {PHASE_ORDER.map((phase) => {
                    const cell = phaseMatrix.matrix[mIdx]?.[phase];
                    if (!cell || cell.avg == null) {
                      return (
                        <TableCell
                          key={phase}
                          sx={{ backgroundColor: colors.primary[700], color: colors.grey[400] }}
                        >
                          —
                        </TableCell>
                      );
                    }
                    const display = cell.avg.toFixed(1);
                    const bgColor = returnBgColor(cell.avg, colors);
                    const yearsList = (cell.yearsUsed || []).join(', ');
                    const tooltipTitle = `${monthLabel} · ${phaseLabel(phase)}: avg ${display}% over ${cell.count} year${cell.count === 1 ? '' : 's'}${yearsList ? ` (${yearsList})` : ''}`;
                    return (
                      <Tooltip
                        key={phase}
                        title={tooltipTitle}
                        enterDelay={isMobile ? 0 : 300}
                        enterTouchDelay={0}
                        PopperProps={{
                          sx: {
                            '& .MuiTooltip-tooltip': {
                              fontSize: '1rem',
                              padding: '8px 12px',
                            },
                          },
                        }}
                      >
                        <TableCell sx={{ backgroundColor: bgColor }}>
                          {`${display}%`}
                        </TableCell>
                      </Tooltip>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={PHASE_ORDER.length + 1} sx={{ height: '8px', backgroundColor: colors.primary[700], padding: 0 }} />
              </TableRow>
              <TableRow>
                <TableCell
                  sx={{
                    backgroundColor: colors.primary[700],
                    color: colors.primary[100],
                    textAlign: 'left',
                    pl: isMobile ? 1 : 1.5,
                    fontSize: isMobile ? '0.7rem' : '0.8rem',
                  }}
                >
                  Years in sample
                </TableCell>
                {PHASE_ORDER.map((phase) => {
                  const n = phaseMatrix.sampleSizes[phase] || 0;
                  const yearsList = (phaseMatrix.phaseYears[phase] || []).join(', ');
                  return (
                    <Tooltip
                      key={phase}
                      title={yearsList ? `${phaseLabel(phase)}: ${yearsList}` : phaseLabel(phase)}
                      enterDelay={isMobile ? 0 : 300}
                      enterTouchDelay={0}
                    >
                      <TableCell
                        sx={{
                          backgroundColor: colors.primary[700],
                          color: colors.grey[100],
                          fontSize: isMobile ? '0.7rem' : '0.8rem',
                        }}
                      >
                        n={n}
                      </TableCell>
                    </Tooltip>
                  );
                })}
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      )}

      <div className="under-chart">
        {!isDashboard && <LastUpdated storageKey="btcData" />}
        {!isDashboard && <BitcoinFees />}
      </div>
      {!isDashboard && (
        <ChartInfoSections
          sections={[
            {
              title: 'What it is',
              content: 'Bitcoin monthly returns measure the percentage change from the first to the last day of each month.',
            },
            {
              title: 'Years vs phase comparison',
              content: (
                <>
                  <strong>Years</strong> shows each calendar year (multi-select years or phases) with an average row for your selection.
                  <strong> Phase comparison</strong> shows average return for each month across all years in that cycle phase — e.g. compare July in midterm years vs July in halving years without building a custom multi-select.
                </>
              ),
            },
            {
              title: 'Cycle phases',
              content: (
                <>
                  Phases are relative to BTC halvings (2012, 2016, 2020, 2024, …):{' '}
                  <strong>halving year</strong> = year of a halving; <strong>post-halving</strong> = year after;{' '}
                  <strong>midterm</strong> = two years after; <strong>pre-halving</strong> = year before the next halving.
                  Hover a phase-matrix cell to see which years enter that average. Sample size (n) is the number of calendar years in each phase.
                </>
              ),
            },
            {
              title: 'What this table shows',
              content:
                analysisView === 'years'
                  ? `Positive returns are green, negative red. Current month values marked * are not final. Showing ${filterDescription(yearFilters)}. The average row uses only the years in the selection.`
                  : 'Each cell is the average monthly return for that month across all years in the phase. Green = positive average, red = negative. Use hover for year lists and sample counts.',
            },
          ]}
        />
      )}
    </div>
  );
};

export default restrictToPaidSubscription(BitcoinMonthlyReturnsTable);
