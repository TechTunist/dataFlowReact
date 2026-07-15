import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import {
    useTheme,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    ListSubheader,
    Checkbox,
    ListItemText,
    Button,
} from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';
import LastUpdated from '../hooks/LastUpdated';
import { useFavorites } from '../contexts/FavoritesContext';
import ChartInfoSections from './ChartInfoSections';
import { useChartData, useChartDataActions } from '../hooks/useChartData';

/**
 * US presidential cycle: years are tagged relative to election years (divisible by 4).
 *   y % 4 === 0 → presidential election
 *   y % 4 === 1 → post-election (year 1 of term)
 *   y % 4 === 2 → midterm election
 *   y % 4 === 3 → pre-election (year 3 of term; historically often strong for equities)
 */
const POLITICAL_PHASE_META = {
    election: { id: 'election', label: 'Presidential election' },
    'post-election': { id: 'post-election', label: 'Post-election' },
    midterm: { id: 'midterm', label: 'Midterm election' },
    'pre-election': { id: 'pre-election', label: 'Pre-election' },
};

/** Calendar years with major equity stress / NBER-adjacent recessions (for SP500 history). */
const RECESSION_CRISIS_LABELS = {
    2000: 'Dot-com peak',
    2001: 'Dot-com bust',
    2002: 'Post-bubble bear',
    2008: 'Financial crisis',
    2009: 'GFC aftermath',
    2011: 'Euro debt / US downgrade',
    2018: 'QT / trade-war selloff',
    2020: 'COVID crash',
    2022: 'Inflation bear market',
};

function politicalPhaseForYear(year) {
    const y = Number(year);
    if (!Number.isFinite(y)) return null;
    const mod = ((y % 4) + 4) % 4;
    if (mod === 0) return 'election';
    if (mod === 1) return 'post-election';
    if (mod === 2) return 'midterm';
    return 'pre-election';
}

function politicalPhaseLabel(phase) {
    return POLITICAL_PHASE_META[phase]?.label || phase;
}

function crisisLabelForYear(year) {
    return RECESSION_CRISIS_LABELS[Number(year)] || null;
}

function isCrisisYear(year) {
    return Boolean(crisisLabelForYear(year));
}

/** Individual-year row label: "2024 — Presidential election" or crisis when present. */
function yearDisplayLabel(year) {
    const y = Number(year);
    const crisis = crisisLabelForYear(y);
    const political = politicalPhaseLabel(politicalPhaseForYear(y));
    if (crisis) return `${y} — ${crisis}`;
    return `${y} — ${political}`;
}

function yearsMatchingOneFilter(allYears, filterKey) {
    if (!filterKey || filterKey === 'all') return allYears;
    if (filterKey.startsWith('political:')) {
        const phase = filterKey.slice('political:'.length);
        return allYears.filter((y) => politicalPhaseForYear(y) === phase);
    }
    if (filterKey === 'crisis:all') {
        return allYears.filter((y) => isCrisisYear(y));
    }
    if (filterKey.startsWith('year:')) {
        const y = filterKey.slice('year:'.length);
        return allYears.filter((yr) => String(yr) === String(y));
    }
    return [];
}

function yearsMatchingFilters(allYears, filterKeys) {
    // Empty selection means no average (same as Bitcoin ROI)
    if (!filterKeys?.length) return [];
    if (filterKeys.includes('all')) return allYears;
    const wanted = new Set();
    filterKeys.forEach((key) => {
        yearsMatchingOneFilter(allYears, key).forEach((y) => wanted.add(String(y)));
    });
    return allYears.filter((y) => wanted.has(String(y)));
}

function optionLabel(value, filterOptions) {
    if (value === 'all') return 'All years';
    if (value === 'crisis:all') return 'All recession / crisis years';
    const political = filterOptions?.political?.find((p) => p.value === value);
    if (political) return political.label;
    const year = filterOptions?.individual?.find((p) => p.value === value);
    if (year) return year.label;
    if (value.startsWith('year:')) return yearDisplayLabel(value.slice(5));
    if (value.startsWith('political:')) return politicalPhaseLabel(value.slice('political:'.length));
    return value;
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

const getDefaultVisibleYear = (yearlyDatasets, currentYear) => {
    const yearNames = yearlyDatasets.map((dataset) => dataset.name);
    if (yearNames.includes(currentYear)) return currentYear;
    return yearNames[yearNames.length - 1] ?? currentYear;
};

const getDefaultYearVisibility = (yearName, visibleYear) =>
    yearName === visibleYear ? true : 'legendonly';

const SP500ROI = ({ isDashboard = false }) => {
    const theme = useTheme();
    const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
    const isMobile = useIsMobile();
    const { fredSeriesData } = useChartData();
    const { fetchFredSeriesData } = useChartDataActions();
    const { favoriteCharts, addFavoriteChart, removeFavoriteChart } = useFavorites();
    const [yearDataSets, setYearDataSets] = useState([]);
    const [visibilityMap, setVisibilityMap] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    /** Multi-select filter keys for averaging: 'all' | 'political:…' | 'crisis:all' | 'year:YYYY' */
    const [yearFilters, setYearFilters] = useState([]);
    const [isSelectAll, setIsSelectAll] = useState(false);
    const visibilityInitializedRef = useRef(false);
    const chartId = "sp500-roi";
    const isFavorite = favoriteCharts.includes(chartId);
    const currentYear = useMemo(() => `${new Date().getFullYear()}`, []);

    const toggleFavorite = () => {
        if (isFavorite) {
            removeFavoriteChart(chartId);
        } else {
            addFavoriteChart(chartId);
        }
    };

    const toggleLegend = () => {
        setLayout((prev) => ({
          ...prev,
          showlegend: !prev.showlegend,
        }));
    };

    const [layout, setLayout] = useState({
        title: isDashboard ? '' : 'Annual S&P 500 ROI',
        margin: { l: 50, r: 50, b: 80, t: 50, pad: 4 },
        plot_bgcolor: colors?.primary?.[700] || '#1F2A44',
        paper_bgcolor: colors?.primary?.[700] || '#1F2A44',
        font: { color: colors?.primary?.[100] || '#FFFFFF' },
        xaxis: {
          title: !isDashboard ? 'Days from Year Start' : '',
          autorange: true,
        },
        yaxis: {
          title: 'Logarithmic ROI (Shifted Base-10)',
          type: 'log',
          autorange: true,
        },
        showlegend: !isDashboard,
        hovermode: 'x unified',
        legend: !isDashboard ? {
          orientation: 'h',
          x: 0.5,
          xanchor: 'center',
          y: -0.15,
          yanchor: 'top',
        } : {},
    });

    // Update chart colors on theme change
    useEffect(() => {
        setLayout((prev) => ({
            ...prev,
            plot_bgcolor: colors.primary[700],
            paper_bgcolor: colors.primary[700],
            font: {
                ...prev.font,
                color: colors.primary[100],
            },
        }));
    }, [colors.primary[700], colors.primary[100]]);

    // Fetch S&P 500 data
    useEffect(() => {
        const fetchData = async () => {
            if (fredSeriesData['SP500']?.length > 0) return;
            setIsLoading(true);
            setError(null);
            try {
                await fetchFredSeriesData('SP500');
            } catch (err) {
                setError('Error fetching S&P 500 data. Please try again later.');
                console.error('Error:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [fetchFredSeriesData, fredSeriesData]);

    // Process yearly data and filter options
    const { yearlyDatasets, allYearStrings, filterOptions } = useMemo(() => {
        const sp500Data = fredSeriesData['SP500'] || [];
        if (sp500Data.length === 0) {
            return {
                yearlyDatasets: [],
                allYearStrings: [],
                filterOptions: { political: [], individual: [] },
            };
        }
        const years = [...new Set(sp500Data.map(d => new Date(d.time).getFullYear()))]
            .sort((a, b) => a - b);
        const processYearlyData = (year) => {
            const yearStart = `${year}-01-01`;
            const yearEnd = `${year}-12-31`;
            const filteredData = sp500Data.filter(item => {
                const date = new Date(item.time);
                return date >= new Date(yearStart) && date <= new Date(yearEnd);
            });

            if (filteredData.length === 0) return null;
            const basePrice = filteredData[0].value;
            return {
                name: `${year}`,
                shortName: `${year}`,
                data: filteredData.map((item, index) => ({
                    day: index,
                    roi: Math.log10(item.value / basePrice) + 1,
                    date: item.time,
                    year
                }))
            };
        };
        const yearlyData = years.map(year => processYearlyData(year)).filter(year => year !== null);
        const yearStrings = years.map((y) => `${y}`);
        const individual = [...years]
            .sort((a, b) => b - a)
            .map((y) => ({
                value: `year:${y}`,
                label: yearDisplayLabel(y),
            }));

        // Only show political categories that actually match at least one year in the series
        const politicalAll = [
            { value: 'political:election', label: 'All presidential election years', phase: 'election' },
            { value: 'political:midterm', label: 'All midterm election years', phase: 'midterm' },
            { value: 'political:pre-election', label: 'All pre-election years', phase: 'pre-election' },
            { value: 'political:post-election', label: 'All post-election years', phase: 'post-election' },
        ];
        const political = politicalAll.filter((opt) =>
            years.some((y) => politicalPhaseForYear(y) === opt.phase)
        );

        return {
            yearlyDatasets: yearlyData,
            allYearStrings: yearStrings,
            filterOptions: {
                political,
                individual,
                hasCrisisYears: years.some((y) => isCrisisYear(y)),
            },
        };
    }, [fredSeriesData]);

    const defaultVisibleYear = useMemo(
        () => getDefaultVisibleYear(yearlyDatasets, currentYear),
        [yearlyDatasets, currentYear]
    );

    // Resolve multi-select filters to concrete years for averaging
    const selectedYears = useMemo(
        () => yearsMatchingFilters(allYearStrings, yearFilters),
        [allYearStrings, yearFilters]
    );

    // Compute average dataset
    const averageDataset = useMemo(() => {
        if (selectedYears.length === 0) return null;
        const selectedDatasets = yearlyDatasets.filter(d => selectedYears.includes(d.name));
        if (selectedDatasets.length === 0) return null;
        const minLength = Math.min(...selectedDatasets.map(d => d.data.length));
        const averageData = [];
        for (let day = 0; day < minLength; day++) {
            const rois = selectedDatasets
                .map(d => d.data[day]?.roi)
                .filter(roi => roi !== undefined);
            if (rois.length > 0) {
                const avgRoi = rois.reduce((sum, roi) => sum + roi, 0) / rois.length;
                averageData.push({
                    day: day,
                    roi: avgRoi,
                    date: selectedDatasets[0].data[day].date
                });
            }
        }
        return {
            name: 'Average of Selected Years',
            shortName: 'Average',
            data: averageData
        };
    }, [selectedYears, yearlyDatasets]);

    // Toggle deselect/select all for legend
    const toggleSelectAllLegend = useCallback(() => {
        setVisibilityMap(prev => {
            const newMap = { ...prev };
            const newVisibility = isSelectAll ? true : 'legendonly';
            yearDataSets.forEach(dataset => {
                if (dataset.shortName !== 'Average' && dataset.shortName !== 'Deselect / Select All') {
                    newMap[dataset.name] = newVisibility;
                }
            });
            return newMap;
        });
        setIsSelectAll(prev => !prev);
    }, [yearDataSets, isSelectAll]);

    // Legend datasets with deselect/select all option
    const legendDataSets = useMemo(() => {
        const datasets = [...yearDataSets];
        if (datasets.length > 0) {
            datasets.push({
                name: 'Deselect / Select All',
                shortName: 'Deselect / Select All',
                data: [{ day: 0, roi: 0 }],
                visible: true,
                showlegend: !isDashboard,
                type: 'scatter',
                mode: 'none'
            });
        }
        return datasets;
    }, [yearDataSets, isDashboard]);

    // Handle year filter multi-select (same pattern as monthly-returns / bitcoin-roi)
    const handleYearFiltersChange = useCallback((event) => {
        const raw = event.target.value;
        let next = typeof raw === 'string' ? raw.split(',') : [...raw];
        const prev = yearFilters;

        if (next.includes('all') && !prev.includes('all')) {
            setYearFilters(['all']);
            return;
        }
        next = next.filter((v) => v !== 'all');
        setYearFilters(next);
    }, [yearFilters]);

    // Deselect all years for averaging
    const deselectAllYears = useCallback(() => {
        setYearFilters([]);
    }, []);

    useEffect(() => {
        if (yearlyDatasets.length === 0) return;

        setVisibilityMap(prev => {
            const newMap = { ...prev };
            const datasets = [...yearlyDatasets];
            if (averageDataset) {
                datasets.push(averageDataset);
            }

            datasets.forEach(dataset => {
                if (dataset.shortName === 'Average') {
                    if (newMap[dataset.name] === undefined) {
                        newMap[dataset.name] = true;
                    }
                    return;
                }

                if (!visibilityInitializedRef.current || newMap[dataset.name] === undefined) {
                    newMap[dataset.name] = getDefaultYearVisibility(dataset.name, defaultVisibleYear);
                }
            });

            visibilityInitializedRef.current = true;
            return newMap;
        });
    }, [yearlyDatasets, averageDataset, defaultVisibleYear]);

    useEffect(() => {
        const datasets = [...yearlyDatasets];
        if (averageDataset) {
            datasets.push(averageDataset);
        }

        const updatedDatasets = datasets.map(dataset => ({
            ...dataset,
            visible: visibilityMap[dataset.name] !== undefined ? visibilityMap[dataset.name] : true
        }));

        setYearDataSets(updatedDatasets);
    }, [yearlyDatasets, averageDataset, visibilityMap]);

    const resetChartView = useCallback(() => {
        setLayout(prev => ({
            ...prev,
            xaxis: { ...prev.xaxis, autorange: true },
            yaxis: { ...prev.yaxis, autorange: true },
            showlegend: !isDashboard
        }));
        setIsSelectAll(false);
        setVisibilityMap(prev => {
            const newMap = { ...prev };
            yearDataSets.forEach(dataset => {
                if (dataset.shortName === 'Average') {
                    newMap[dataset.name] = true;
                } else if (dataset.shortName !== 'Deselect / Select All') {
                    newMap[dataset.name] = getDefaultYearVisibility(dataset.name, defaultVisibleYear);
                }
            });
            return newMap;
        });
    }, [yearDataSets, defaultVisibleYear, isDashboard]);

    const handleRelayout = useCallback((event) => {
        if (event['xaxis.range[0]'] || event['yaxis.range[0]']) {
            setLayout(prev => ({
                ...prev,
                xaxis: {
                    ...prev.xaxis,
                    range: [event['xaxis.range[0]'], event['xaxis.range[1]']],
                    autorange: false
                },
                yaxis: {
                    ...prev.yaxis,
                    range: [event['yaxis.range[0]'], event['yaxis.range[1]']],
                    autorange: false
                }
            }));
        }
    }, []);

    const handleLegendClick = useCallback((event) => {
        const name = event.data[event.curveNumber].name;
        if (name === 'Deselect / Select All') {
            toggleSelectAllLegend();
            return false;
        }
        setVisibilityMap(prev => {
            const newMap = { ...prev };
            newMap[name] = newMap[name] === 'legendonly' ? true : 'legendonly';
            return newMap;
        });
        return false;
    }, [toggleSelectAllLegend]);

    // Get the latest timestamp from fredSeriesData['SP500'] for LastUpdated
    const latestTimestamp = fredSeriesData['SP500']?.length > 0
      ? fredSeriesData['SP500'][fredSeriesData['SP500'].length - 1].time
      : null;

    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'stretch', sm: 'center' },
                            justifyContent: 'space-between',
                            gap: { xs: '10px', sm: '12px' },
                            marginBottom: '10px',
                            marginTop: '8px',
                            width: '100%',
                            flexWrap: 'wrap',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', sm: 'row' },
                                alignItems: { xs: 'stretch', sm: 'center' },
                                gap: { xs: '10px', sm: '8px' },
                                flex: { xs: '1 1 100%', sm: '1 1 auto' },
                                minWidth: 0,
                            }}
                        >
                            <FormControl sx={{ minWidth: '150px', width: { xs: '100%', sm: '360px' }, flex: { xs: '1 1 auto', sm: '0 0 360px' } }}>
                                <InputLabel
                                    id="years-label"
                                    shrink
                                    sx={labelSx(colors)}
                                >
                                    Years to Average
                                </InputLabel>
                                <Select
                                    multiple
                                    value={yearFilters}
                                    onChange={handleYearFiltersChange}
                                    label="Years to Average"
                                    labelId="years-label"
                                    displayEmpty
                                    renderValue={(selected) => {
                                        if (!selected?.length) return 'Select years';
                                        if (selected.includes('all')) return 'All years';
                                        if (selected.length === 1) return optionLabel(selected[0], filterOptions);
                                        return `${selected.length} selected`;
                                    }}
                                    sx={{
                                        ...selectControlSx(colors),
                                        '& .MuiSelect-select:empty': { color: colors.grey[500] },
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
                                        Political cycle (add all matching years)
                                    </ListSubheader>
                                    {filterOptions.political.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>
                                            <Checkbox
                                                checked={yearFilters.includes(opt.value)}
                                                sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                                            />
                                            <ListItemText primary={opt.label} />
                                        </MenuItem>
                                    ))}

                                    {filterOptions.hasCrisisYears && (
                                        <>
                                            <ListSubheader
                                                sx={{
                                                    backgroundColor: colors.primary[600],
                                                    color: colors.greenAccent[400],
                                                    lineHeight: '36px',
                                                }}
                                            >
                                                Recessions &amp; market crises
                                            </ListSubheader>
                                            <MenuItem value="crisis:all">
                                                <Checkbox
                                                    checked={yearFilters.includes('crisis:all')}
                                                    sx={{ color: colors.grey[100], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                                                />
                                                <ListItemText primary="All recession / crisis years" />
                                            </MenuItem>
                                        </>
                                    )}

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
                            <Button
                                onClick={deselectAllYears}
                                sx={{
                                    backgroundColor: 'transparent',
                                    color: colors.primary[100],
                                    border: `1px solid ${colors.greenAccent[400]}`,
                                    borderRadius: '4px',
                                    padding: '8px 16px',
                                    fontSize: '14px',
                                    textTransform: 'none',
                                    '&:hover': {
                                        backgroundColor: colors.greenAccent[400],
                                        color: theme.palette.mode === 'dark' ? colors.grey[900] : colors.grey[100],
                                    },
                                }}
                            >
                                {isMobile ? 'Deselect' : 'Deselect All'}
                            </Button>
                            <Button
                                onClick={toggleLegend}
                                sx={{
                                    backgroundColor: 'transparent',
                                    color: colors.primary[100],
                                    border: `1px solid ${colors.greenAccent[400]}`,
                                    borderRadius: '4px',
                                    padding: '8px 16px',
                                    fontSize: '14px',
                                    textTransform: 'none',
                                    '&:hover': {
                                        backgroundColor: colors.greenAccent[400],
                                        color: theme.palette.mode === 'dark' ? colors.grey[900] : colors.grey[100],
                                    },
                                }}
                            >
                                {layout.showlegend ? 'Hide Legend' : 'Show Legend'}
                            </Button>
                        </Box>
                    </Box>
                    <div className="chart-top-div" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px' }}>
                        {isLoading && <span style={{ color: colors.primary[100], marginRight: '10px' }}>Loading...</span>}
                        {error && <span style={{ color: colors.redAccent[500], marginRight: '10px' }}>{error}</span>}
                        <button onClick={resetChartView} className="button-reset extra-margin">
                            Reset Chart
                        </button>
                    </div>
                </>
            )}
            <div
                className="chart-container"
                style={{
                    height: isDashboard ? '100%' : 'calc(100% - 40px)',
                    width: '100%',
                    border: '2px solid #a9a9a9'
                }}
            >
                <Plot
                    data={legendDataSets.map(item => ({
                        x: item.data.map(d => d.day),
                        y: item.data.map(d => d.roi),
                        type: 'scatter',
                        mode: item.shortName === 'Deselect / Select All' ? 'none' : 'lines',
                        name: item.name,
                        line: {
                            color: item.shortName === 'Average' ? colors.greenAccent[500] : undefined,
                            width: item.shortName === 'Average' ? 3 : 2,
                            dash: item.shortName === 'Average' ? 'dash' : 'solid'
                        },
                        text: item.shortName !== 'Deselect / Select All'
                            ? item.data.map(d => `<b>${item.shortName} ROI: ${d.roi.toFixed(2)}</b> (${new Date(d.date).toLocaleDateString()})`)
                            : ['Toggle All Series Visibility'],
                        hoverinfo: item.shortName === 'Deselect / Select All' ? 'none' : 'text',
                        hovertemplate: item.shortName === 'Deselect / Select All' ? undefined : `%{text}<extra></extra>`,
                        visible: visibilityMap[item.name] !== undefined ? visibilityMap[item.name] : getDefaultYearVisibility(item.name, defaultVisibleYear),
                        showlegend: !isDashboard,
                        hoverlabel: {
                            bgcolor: colors.primary[900],
                            font: { color: colors.primary[100], size: isMobile ? 12 : 14 },
                            bordercolor: colors.grey[300],
                            align: 'left',
                        },
                    }))}
                    layout={layout}
                    config={{
                        staticPlot: isDashboard,
                        displayModeBar: false,
                        responsive: true
                    }}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                    onRelayout={handleRelayout}
                    onLegendClick={handleLegendClick}
                />
            </div>
            <div className='under-chart'>
                {!isDashboard && fredSeriesData['SP500']?.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                        <LastUpdated customDate={latestTimestamp} />
                    </div>
                )}
            </div>
            {!isDashboard && (
                <ChartInfoSections
                    sx={{ color: colors.primary[100] }}
                    sections={[
                        {
                            title: 'What it is',
                            content:
                                'Year-by-year S&P 500 return on investment (ROI) on a shifted logarithmic scale.',
                        },
                        {
                            title: 'How it is built',
                            content:
                                'ROI = log10(price / basePrice) + 1, where 1 means no change, above 1 is positive return, and below 1 is negative return.',
                        },
                        {
                            title: 'How to interpret',
                            content:
                                'Select years or categories to average: political-cycle buckets (presidential election, midterm, pre-election, post-election), recession/crisis years, or individual years. Use Deselect / Select All in the legend to toggle series visibility. Pre-election years have historically been among the stronger equity years on average; midterms are often more mixed.',
                        },
                    ]}
                />
            )}
        </div>
    );
};

export default restrictToPaidSubscription(SP500ROI);
