/**
 * WorkbenchView — presentational shell for Workbench (selectors, dialogs, chart chrome).
 * Chart lifecycle / series sync stays in Workbench.jsx orchestrator.
 */
import React from 'react';
import ErrorBoundary from '../ErrorBoundary';
import ChartInfoSections from '../ChartInfoSections';
import {
  Box, FormControl, InputLabel, Select, MenuItem, Checkbox, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, TextField, Snackbar, Alert,
} from '@mui/material';
import {
  availableMacroSeries,
  availableCryptoSeries,
  availableIndicatorSeries,
  availableStockSeries,
} from './availableSeries';
import { STOCK_GROUPS } from '../../config/stocksConfig';
import { resolveRatioChartPoints } from '../../utils/derivedRatioUtils';

const renderWorkbenchCompactTags = (tagValue) => (
  <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
    {tagValue.length === 0
      ? ''
      : tagValue.length === 1
        ? tagValue[0].label
        : `${tagValue.length} selected`}
  </Box>
);

const workbenchSelectorAutocompleteSx = (breakpointForRow) => ({
  minWidth: '250px',
  width: { xs: '100%', [breakpointForRow]: '250px' },
  maxWidth: { xs: '100%', [breakpointForRow]: '250px' },
  '& .MuiAutocomplete-inputRoot': {
    flexWrap: 'nowrap',
    overflow: 'hidden',
    alignItems: 'center',
  },
});

const workbenchSelectorFieldSx = (breakpointForRow, colors, theme) => ({
  minWidth: '250px',
  width: { xs: '100%', [breakpointForRow]: '250px' },
  maxWidth: { xs: '100%', [breakpointForRow]: '250px' },
  '& .MuiInputLabel-root': { color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] },
  '& .MuiInputLabel-root.Mui-focused': { color: colors.greenAccent[500] },
  '& .MuiOutlinedInput-root': {
    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
    flexWrap: 'nowrap',
    overflow: 'hidden',
    '& fieldset': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
    '&:hover fieldset': { borderColor: colors.greenAccent[500] },
    '&.Mui-focused fieldset': { borderColor: colors.greenAccent[500] },
  },
  '& .MuiAutocomplete-input': {
    minWidth: '0 !important',
  },
});


export default function WorkbenchView(props) {
  const {
    isDashboard,
    theme,
    colors,
    chartContainerRef,
    breakpointForRow,
    stockSelectorOptions,
    hasDerived,
    editClicked,
    openDialog,
    snackbar,
    setSnackbar,
    scaleModeState,
    isInteractive,
    isLoading,
    error,
    mgmt,
    derivedHook,
    movingAverages,
    seriesData,
    handleEditClick,
    handleMovingAverageChange,
    handleColorChange,
    handleSaveDialog,
    handleCloseDialog,
    toggleScaleMode,
    setInteractivity,
    resetChartView,
    clearAllSeries,
    handleSaveWorkbench,
    explanation,
  } = props;

  return (
    <ErrorBoundary fallbackMessage="The custom indicator workbench failed to load. Try refreshing or selecting different series.">
      <div style={{ height: '100%' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', [breakpointForRow]: 'row' },
            alignItems: { xs: 'stretch', [breakpointForRow]: 'center' },
            justifyContent: 'center',
            gap: '20px',
            marginBottom: '30px',
            marginTop: '8px',
            width: '100%',
            mx: 'auto',
          }}
        >
          <Autocomplete
            multiple
            disableCloseOnSelect={true}
            id="crypto-series"
            options={Object.entries(availableCryptoSeries).map(([id, { label }]) => ({ id, label }))}
            getOptionLabel={(option) => option.label}
            value={(mgmt.activeCryptoSeries || []).map(id => ({ id, label: availableCryptoSeries[id].label }))}
            onChange={(event, newValue) => mgmt.handleCryptoSeriesChange({ target: { value: newValue.map(v => v.id) } }, availableCryptoSeries)}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderTags={(tagValue) => (
              <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tagValue.map((option) => option.label).join(', ')}
              </Box>
            )}
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option.id}>
                <Checkbox
                  style={{ marginRight: 8 }}
                  checked={selected}
                  sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                />
                {option.label}
                <Box sx={{ ml: 'auto' }}>
                  <Button
                    onClick={(e) => handleEditClick(e, option.id, 'crypto')}
                    disabled={!(mgmt.activeCryptoSeries || []).includes(option.id)}
                    sx={{
                      textTransform: 'none',
                      fontSize: '12px',
                      color: (mgmt.activeCryptoSeries || []).includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                      border: `1px solid ${(mgmt.activeCryptoSeries || []).includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600])}`,
                      borderRadius: '4px',
                      padding: '2px 8px',
                      minWidth: '50px',
                      backgroundColor: editClicked[option.id] ? '#4cceac' : 'transparent',
                      ...(editClicked[option.id] && { color: 'black', borderColor: 'violet' }),
                      '&:hover': {
                        borderColor: (mgmt.activeCryptoSeries || []).includes(option.id) ? colors.greenAccent[500] : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                        backgroundColor: (mgmt.activeCryptoSeries || []).includes(option.id) && !editClicked[option.id] ? (theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300]) : 'transparent',
                      },
                      '&.Mui-disabled': {
                        pointerEvents: 'none',
                        opacity: 0.6,
                      },
                    }}
                  >
                    Edit
                  </Button>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Crypto Series"
                sx={{
                  minWidth: '250px',
                  width: { xs: '100%', [breakpointForRow]: '250px' },
                  '& .MuiInputLabel-root': { color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] },
                  '& .MuiInputLabel-root.Mui-focused': { color: colors.greenAccent[500] },
                  '& .MuiOutlinedInput-root': {
                    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
                    '& fieldset': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                    '&:hover fieldset': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused fieldset': { borderColor: colors.greenAccent[500] },
                  },
                }}
              />
            )}
          />
          <Autocomplete
            multiple
            disableCloseOnSelect={true}
            id="indicator-series"
            options={Object.entries(availableIndicatorSeries).map(([id, { label }]) => ({ id, label }))}
            getOptionLabel={(option) => option.label}
            value={(mgmt.activeIndicatorSeries || []).map(id => ({ id, label: availableIndicatorSeries[id].label }))}
            onChange={(event, newValue) => mgmt.handleIndicatorSeriesChange({ target: { value: newValue.map(v => v.id) } }, availableIndicatorSeries)}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderTags={(tagValue) => (
              <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tagValue.map((option) => option.label).join(', ')}
              </Box>
            )}
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option.id}>
                <Checkbox
                  style={{ marginRight: 8 }}
                  checked={selected}
                  sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                />
                {option.label}
                <Box sx={{ ml: 'auto' }}>
                  <Button
                    onClick={(e) => handleEditClick(e, option.id, 'indicator')}
                    disabled={!(mgmt.activeIndicatorSeries || []).includes(option.id)}
                    sx={{
                      textTransform: 'none',
                      fontSize: '12px',
                      color: (mgmt.activeIndicatorSeries || []).includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                      border: `1px solid ${(mgmt.activeIndicatorSeries || []).includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600])}`,
                      borderRadius: '4px',
                      padding: '2px 8px',
                      minWidth: '50px',
                      backgroundColor: editClicked[option.id] ? '#4cceac' : 'transparent',
                      ...(editClicked[option.id] && { color: 'black', borderColor: 'violet' }),
                      '&:hover': {
                        borderColor: (mgmt.activeIndicatorSeries || []).includes(option.id) ? colors.greenAccent[500] : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                        backgroundColor: (mgmt.activeIndicatorSeries || []).includes(option.id) && !editClicked[option.id] ? (theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300]) : 'transparent',
                      },
                      '&.Mui-disabled': {
                        pointerEvents: 'none',
                        opacity: 0.6,
                      },
                    }}
                  >
                    Edit
                  </Button>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Indicators"
                sx={{
                  minWidth: '250px',
                  width: { xs: '100%', [breakpointForRow]: '250px' },
                  '& .MuiInputLabel-root': { color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] },
                  '& .MuiInputLabel-root.Mui-focused': { color: colors.greenAccent[500] },
                  '& .MuiOutlinedInput-root': {
                    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
                    '& fieldset': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                    '&:hover fieldset': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused fieldset': { borderColor: colors.greenAccent[500] },
                  },
                }}
              />
            )}
          />
          <Autocomplete
            multiple
            disableCloseOnSelect={true}
            id="stock-series"
            sx={workbenchSelectorAutocompleteSx(breakpointForRow)}
            options={stockSelectorOptions}
            groupBy={(option) => option.group}
            getOptionLabel={(option) => option.label}
            value={(mgmt.activeStockSeries || []).map(id => ({ id, label: availableStockSeries[id]?.label, group: STOCK_GROUPS.find(g => g.stocks.some(s => s.value === id))?.label }))}
            onChange={(event, newValue) => mgmt.handleStockSeriesChange({ target: { value: newValue.map(v => v.id) } }, availableStockSeries)}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderTags={renderWorkbenchCompactTags}
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option.id}>
                <Checkbox
                  style={{ marginRight: 8 }}
                  checked={selected}
                  sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                />
                {option.label}
                <Box sx={{ ml: 'auto' }}>
                  <Button
                    onClick={(e) => handleEditClick(e, option.id, 'stock')}
                    disabled={!(mgmt.activeStockSeries || []).includes(option.id)}
                    sx={{
                      textTransform: 'none',
                      fontSize: '12px',
                      color: (mgmt.activeStockSeries || []).includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                      border: `1px solid ${(mgmt.activeStockSeries || []).includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600])}`,
                      borderRadius: '4px',
                      padding: '2px 8px',
                      minWidth: '50px',
                      backgroundColor: editClicked[option.id] ? '#4cceac' : 'transparent',
                      ...(editClicked[option.id] && { color: 'black', borderColor: 'violet' }),
                      '&:hover': {
                        borderColor: (mgmt.activeStockSeries || []).includes(option.id) ? colors.greenAccent[500] : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                        backgroundColor: (mgmt.activeStockSeries || []).includes(option.id) && !editClicked[option.id] ? (theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300]) : 'transparent',
                      },
                      '&.Mui-disabled': {
                        pointerEvents: 'none',
                        opacity: 0.6,
                      },
                    }}
                  >
                    Edit
                  </Button>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Stocks"
                sx={workbenchSelectorFieldSx(breakpointForRow, colors, theme)}
              />
            )}
          />
          <Autocomplete
            multiple
            disableCloseOnSelect={true}
            id="macro-series"
            sx={workbenchSelectorAutocompleteSx(breakpointForRow)}
            options={Object.entries(availableMacroSeries).map(([id, { label }]) => ({ id, label }))}
            getOptionLabel={(option) => option.label}
            value={(mgmt.activeMacroSeries || []).map(id => ({ id, label: availableMacroSeries[id].label }))}
            onChange={(event, newValue) => mgmt.handleMacroSeriesChange({ target: { value: newValue.map(v => v.id) } }, availableMacroSeries)}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderTags={renderWorkbenchCompactTags}
            renderOption={(props, option, { selected }) => (
              <li {...props} key={option.id}>
                <Checkbox
                  style={{ marginRight: 8 }}
                  checked={selected}
                  sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                />
                {option.label}
                <Box sx={{ ml: 'auto' }}>
                  <Button
                    onClick={(e) => handleEditClick(e, option.id, 'macro')}
                    disabled={!(mgmt.activeMacroSeries || []).includes(option.id)}
                    sx={{
                      textTransform: 'none',
                      fontSize: '12px',
                      color: (mgmt.activeMacroSeries || []).includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                      border: `1px solid ${(mgmt.activeMacroSeries || []).includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600])}`,
                      borderRadius: '4px',
                      padding: '2px 8px',
                      minWidth: '50px',
                      backgroundColor: editClicked[option.id] ? '#4cceac' : 'transparent',
                      ...(editClicked[option.id] && { color: 'black', borderColor: 'violet' }),
                      '&:hover': {
                        borderColor: (mgmt.activeMacroSeries || []).includes(option.id) ? colors.greenAccent[500] : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                        backgroundColor: (mgmt.activeMacroSeries || []).includes(option.id) && !editClicked[option.id] ? (theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300]) : 'transparent',
                      },
                      '&.Mui-disabled': {
                        pointerEvents: 'none',
                        opacity: 0.6,
                      },
                    }}
                  >
                    Edit
                  </Button>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Macro Data"
                sx={workbenchSelectorFieldSx(breakpointForRow, colors, theme)}
              />
            )}
          />
          {hasDerived && (
            <Autocomplete
              multiple
              disableCloseOnSelect={true}
              id="derived-series"
              sx={workbenchSelectorAutocompleteSx(breakpointForRow)}
              options={(derivedHook.derivedSeriesDefs || []).map(d => ({ id: d.id, label: d.label }))}
              getOptionLabel={(option) => option.label}
              value={(mgmt.activeDerivedSeries || []).map(id => ({ id, label: (derivedHook.derivedSeriesDefs || []).find(d => d.id === id)?.label }))}
              onChange={(event, newValue) => mgmt.handleDerivedSeriesChange({ target: { value: newValue.map(v => v.id) } })}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderTags={renderWorkbenchCompactTags}
              renderOption={(props, option, { selected }) => (
                <li {...props} key={option.id}>
                  <Checkbox
                    style={{ marginRight: 8 }}
                    checked={selected}
                    sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                  />
                  <span>{option.label}</span>
                  {(() => {
                    const d = (derivedHook.derivedSeriesDefs || []).find(dd => dd.id === option.id);
                    const desc = d && derivedHook.getDerivedDescription ? derivedHook.getDerivedDescription(d) : '';
                    return desc ? <span style={{ marginLeft: 8, fontSize: '10px', opacity: 0.6 }}>({desc})</span> : null;
                  })()}
                  <Box sx={{ ml: 'auto' }}>
                    <Button
                      onClick={(e) => handleEditClick(e, option.id, 'derived')}
                      disabled={!(mgmt.activeDerivedSeries || []).includes(option.id)}
                      sx={{
                        textTransform: 'none',
                        fontSize: '12px',
                        color: (mgmt.activeDerivedSeries || []).includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                        border: `1px solid ${(mgmt.activeDerivedSeries || []).includes(option.id) ? (theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]) : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600])}`,
                        borderRadius: '4px',
                        padding: '2px 8px',
                        minWidth: '50px',
                        backgroundColor: editClicked[option.id] ? '#4cceac' : 'transparent',
                        ...(editClicked[option.id] && { color: 'black', borderColor: 'violet' }),
                        '&:hover': {
                          borderColor: (mgmt.activeDerivedSeries || []).includes(option.id) ? colors.greenAccent[500] : (theme.palette.mode === 'dark' ? colors.grey[500] : colors.grey[600]),
                          backgroundColor: (mgmt.activeDerivedSeries || []).includes(option.id) && !editClicked[option.id] ? (theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300]) : 'transparent',
                        },
                        '&.Mui-disabled': {
                          pointerEvents: 'none',
                          opacity: 0.6,
                        },
                      }}
                    >
                      Edit
                    </Button>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Derived Series"
                  sx={workbenchSelectorFieldSx(breakpointForRow, colors, theme)}
                />
              )}
            />
          )}
        </Box>
      )}
      <Dialog
        open={derivedHook.showDerivedDialog}
        onClose={() => derivedHook.closeDerivedDialog()}
        maxWidth="xs"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
            color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
            borderRadius: '8px',
          },
        }}
      >
        <DialogTitle sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], fontSize: '18px' }}>
          Create Derived Series
        </DialogTitle>
        <DialogContent>
          {/* Mode selector: keeps arithmetic simple for ratios/diffs while exposing powerful user-friendly trend fits */}
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="derived-mode-label">Creation Mode</InputLabel>
            <Select
              labelId="derived-mode-label"
              label="Creation Mode"
              value={derivedHook.newDerivedMode || 'arithmetic'}
              onChange={(e) => derivedHook.setNewDerivedMode(e.target.value)}
              sx={{
                color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                borderRadius: '4px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
              }}
            >
              <MenuItem value="arithmetic">Arithmetic Operation (combine two series)</MenuItem>
              <MenuItem value="ratio">Ratio Comparison (rebased relationship)</MenuItem>
              <MenuItem value="trendline">Trendline Fit (plot line on one series)</MenuItem>
            </Select>
          </FormControl>

          {(derivedHook.newDerivedMode || 'arithmetic') === 'ratio' ? (
            <>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="derived-ratio-output-label">Output Type</InputLabel>
                <Select
                  labelId="derived-ratio-output-label"
                  label="Output Type"
                  value={derivedHook.newDerivedRatioOutput || 'relative_performance'}
                  onChange={(e) => derivedHook.setNewDerivedRatioOutput(e.target.value)}
                  sx={{
                    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                    borderRadius: '4px',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  }}
                >
                  <MenuItem value="relative_performance">Relative Performance (100 = equal growth)</MenuItem>
                  <MenuItem value="spread">Spread / Difference (indexed % gap)</MenuItem>
                  <MenuItem value="rolling_zscore">Rolling Z-Score (of raw price ratio)</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="derived-ratio-num-label">Numerator</InputLabel>
                <Select
                  labelId="derived-ratio-num-label"
                  label="Numerator"
                  value={derivedHook.newDerivedSeries1}
                  onChange={(e) => derivedHook.setNewDerivedSeries1(e.target.value)}
                  sx={{
                    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                    borderRadius: '4px',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  }}
                >
                  {createDialogSeriesIds.map(id => (
                    <MenuItem key={id} value={id}>
                      {getSeriesLabel(id)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="derived-ratio-den-label">Denominator</InputLabel>
                <Select
                  labelId="derived-ratio-den-label"
                  label="Denominator"
                  value={derivedHook.newDerivedSeries2}
                  onChange={(e) => derivedHook.setNewDerivedSeries2(e.target.value)}
                  sx={{
                    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                    borderRadius: '4px',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  }}
                >
                  {createDialogSeriesIds.map(id => (
                    <MenuItem key={id} value={id}>
                      {getSeriesLabel(id)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {(derivedHook.newDerivedRatioOutput || 'relative_performance') === 'rolling_zscore' && (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel id="derived-zscore-window-label">Z-Score Window</InputLabel>
                  <Select
                    labelId="derived-zscore-window-label"
                    label="Z-Score Window"
                    value={derivedHook.newDerivedZscoreWindow || 252}
                    onChange={(e) => derivedHook.setNewDerivedZscoreWindow(parseInt(e.target.value, 10))}
                    sx={{
                      color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                      backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                      borderRadius: '4px',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                    }}
                  >
                    <MenuItem value={30}>30 days</MenuItem>
                    <MenuItem value={90}>90 days</MenuItem>
                    <MenuItem value={252}>252 days (~1 trading year)</MenuItem>
                  </Select>
                </FormControl>
              )}
              <Box sx={{ mt: 1.5, fontSize: '12px', opacity: 0.85, color: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] }}>
                {(derivedHook.newDerivedRatioOutput || 'relative_performance') === 'relative_performance' && (
                  <>Anchored at the first date both series exist (start of the shorter history). Linear scale: 100 = equal growth. Log scale: shows log-relative performance (0 = equal).</>
                )}
                {(derivedHook.newDerivedRatioOutput || 'relative_performance') === 'spread' && (
                  <>Anchored at first overlap. Linear scale: indexed % point gap (0 = equal). Log scale: log-relative difference.</>
                )}
                {(derivedHook.newDerivedRatioOutput || 'relative_performance') === 'rolling_zscore' && (
                  <>Z-score of the raw price ratio (numerator ÷ denominator). Positive = ratio unusually high vs recent history; negative = unusually low.</>
                )}
              </Box>
            </>
          ) : (derivedHook.newDerivedMode || 'arithmetic') === 'arithmetic' ? (
            <>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="derived-series1-label">Series 1</InputLabel>
                <Select
                  labelId="derived-series1-label"
                  label="Series 1"
                  value={derivedHook.newDerivedSeries1}
                  onChange={(e) => derivedHook.setNewDerivedSeries1(e.target.value)}
                  sx={{
                    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                    borderRadius: '4px',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  }}
                >
                  {createDialogSeriesIds.map(id => (
                    <MenuItem key={id} value={id}>
                      {getSeriesLabel(id)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="derived-operation-label">Operation</InputLabel>
                <Select
                  labelId="derived-operation-label"
                  label="Operation"
                  value={derivedHook.newDerivedOperation}
                  onChange={(e) => derivedHook.setNewDerivedOperation(e.target.value)}
                  sx={{
                    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                    borderRadius: '4px',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  }}
                >
                  <MenuItem value="+">Addition (+)</MenuItem>
                  <MenuItem value="-">Subtraction (−)</MenuItem>
                  <MenuItem value="*">Multiplication (×)</MenuItem>
                  <MenuItem value="/">Division (÷)</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="derived-series2-label">Series 2</InputLabel>
                <Select
                  labelId="derived-series2-label"
                  label="Series 2"
                  value={derivedHook.newDerivedSeries2}
                  onChange={(e) => derivedHook.setNewDerivedSeries2(e.target.value)}
                  sx={{
                    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                    borderRadius: '4px',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  }}
                >
                  {createDialogSeriesIds.map(id => (
                    <MenuItem key={id} value={id}>
                      {getSeriesLabel(id)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          ) : (
            <>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="derived-base-label">Base Series</InputLabel>
                <Select
                  labelId="derived-base-label"
                  label="Base Series"
                  value={derivedHook.newDerivedBaseSeries}
                  onChange={(e) => derivedHook.setNewDerivedBaseSeries(e.target.value)}
                  sx={{
                    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                    borderRadius: '4px',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  }}
                >
                  {createDialogSeriesIds.map(id => (
                    <MenuItem key={id} value={id}>
                      {getSeriesLabel(id)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="derived-trend-type-label">Trend Type</InputLabel>
                <Select
                  labelId="derived-trend-type-label"
                  label="Trend Type"
                  value={derivedHook.newDerivedTrendType || 'linear'}
                  onChange={(e) => derivedHook.setNewDerivedTrendType(e.target.value)}
                  sx={{
                    color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                    backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                    borderRadius: '4px',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                  }}
                >
                  <MenuItem value="linear">Linear, straight line (y = a + b·x)</MenuItem>
                  <MenuItem value="logarithmic">Logarithmic, slow growth/decline (y = a + b·ln(x))</MenuItem>
                  <MenuItem value="polynomial">Polynomial, smooth curve with bends</MenuItem>
                  <MenuItem value="power">Power, scaling relationship (y = a · x^b)</MenuItem>
                  <MenuItem value="exponential">Exponential, compound growth (y = a · e^(b·x))</MenuItem>
                </Select>
              </FormControl>
              {(derivedHook.newDerivedTrendType || 'linear') === 'polynomial' && (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel id="derived-poly-degree-label">Polynomial Degree</InputLabel>
                  <Select
                    labelId="derived-poly-degree-label"
                    label="Polynomial Degree"
                    value={derivedHook.newDerivedPolyDegree || 2}
                    onChange={(e) => derivedHook.setNewDerivedPolyDegree(parseInt(e.target.value, 10))}
                    sx={{
                      color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                      backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                      borderRadius: '4px',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                    }}
                  >
                    <MenuItem value={2}>Degree 2, quadratic (one bend)</MenuItem>
                    <MenuItem value={3}>Degree 3, cubic (two bends)</MenuItem>
                    <MenuItem value={4}>Degree 4, quartic (more flexible)</MenuItem>
                  </Select>
                </FormControl>
              )}
              {/* Tiny user-friendly hint (no math required) */}
              <Box sx={{ mt: 1, fontSize: '12px', opacity: 0.85, color: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] }}>
                {(derivedHook.newDerivedTrendType || 'linear') === 'linear' && 'Fits the straight line that best matches the overall direction.'}
                {(derivedHook.newDerivedTrendType || 'linear') === 'logarithmic' && 'Good for series that rise or fall quickly at first then level off.'}
                {(derivedHook.newDerivedTrendType || 'linear') === 'polynomial' && 'Captures curves and turns in the data. Higher degree = wigglier fit.'}
                {(derivedHook.newDerivedTrendType || 'linear') === 'power' && 'Useful for relationships that scale (e.g. super-linear or diminishing).'}
                {(derivedHook.newDerivedTrendType || 'linear') === 'exponential' && 'Models compound growth or decay (requires positive values).'}
              </Box>
            </>
          )}

          <TextField
            fullWidth
            label="Label"
            value={derivedHook.newDerivedLabel}
            onChange={(e) => derivedHook.setNewDerivedLabel(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="Auto-filled if left blank"
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="derived-color-label">Color</InputLabel>
            <input
              type="color"
              value={derivedHook.newDerivedColor}
              onChange={(e) => derivedHook.setNewDerivedColor(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                marginTop: '8px',
                borderRadius: '4px',
                border: `1px solid ${theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]}`,
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
              }}
            />
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => derivedHook.closeDerivedDialog()}
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: 'white',
              '&:hover': {
                backgroundColor: '#D500F9',
                color: 'black',
              },
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={derivedHook.handleCreateDerived}
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: 'white',
              '&:hover': {
                backgroundColor: '#D500F9',
                color: 'black',
              },
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={openDialog.open}
        onClose={handleCloseDialog}
        maxWidth="xs"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: theme.palette.mode === 'dark' ? colors.primary[500] : colors.primary[200],
            color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
            borderRadius: '8px',
          },
        }}
      >
        <DialogTitle sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900], fontSize: '18px' }}>
          {openDialog.seriesId ? seriesData.getSeriesInfo(openDialog.seriesId, openDialog.type)?.label : ''}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="moving-average-label">Moving Averages</InputLabel>
            <Select
              labelId="moving-average-label"
              label="Moving Averages"
              value={movingAverages.dialogMovingAverage}
              onChange={handleMovingAverageChange}
              sx={{
                color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
                borderRadius: '4px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
              }}
            >
              <MenuItem value="None">None</MenuItem>
              <MenuItem value="7 day">7 day</MenuItem>
              <MenuItem value="28 day">28 day</MenuItem>
              <MenuItem value="3 month">3 month</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="color-label">Color</InputLabel>
            <input
              type="color"
              value={movingAverages.dialogColor}
              onChange={handleColorChange}
              style={{
                width: '100%',
                height: '40px',
                marginTop: '8px',
                borderRadius: '4px',
                border: `1px solid ${theme.palette.mode === 'dark' ? colors.grey[300] : colors.grey[700]}`,
                backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.primary[300],
              }}
            />
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          <Button onClick={handleSaveDialog}>Save</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity="error" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      {!isDashboard && (
        <div className='chart-top-div'>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <label className="switch">
              <input type="checkbox" checked={scaleModeState === 1} onChange={toggleScaleMode} />
              <span className="slider round"></span>
            </label>
            <span style={{ color: theme.palette.mode === 'dark' ? colors.primary[100] : colors.grey[900] }}>
              {scaleModeState === 1 ? 'Logarithmic' : 'Linear'}
            </span>
            {isLoading && (
              <span style={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] }}>
                Loading...
              </span>
            )}
            {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={setInteractivity}
              className="button-reset"
              style={{
                backgroundColor: isInteractive ? '#4cceac' : 'transparent',
                color: isInteractive ? 'black' : (theme.palette.mode === 'dark' ? '#31d6aa' : colors.grey[900]),
                borderColor: isInteractive ? 'violet' : (theme.palette.mode === 'dark' ? '#70d8bd' : colors.grey[700]),
              }}
            >
              {isInteractive ? 'Disable Interactivity' : 'Enable Interactivity'}
            </button>
            <button
              onClick={resetChartView}
              className="button-reset"
              style={{
                color: theme.palette.mode === 'dark' ? '#31d6aa' : colors.grey[900],
                borderColor: theme.palette.mode === 'dark' ? '#70d8bd' : colors.grey[700],
              }}
            >
              Reset Chart
            </button>
            <button
              onClick={clearAllSeries}
              className="button-reset"
              style={{
                color: theme.palette.mode === 'dark' ? '#31d6aa' : colors.grey[900],
                borderColor: theme.palette.mode === 'dark' ? '#70d8bd' : colors.grey[700],
              }}
            >
              Clear All
            </button>
            <button
              onClick={handleSaveWorkbench}
              className="button-reset"
              style={{
                color: theme.palette.mode === 'dark' ? '#31d6aa' : colors.grey[900],
                borderColor: theme.palette.mode === 'dark' ? '#70d8bd' : colors.grey[700],
              }}
            >
              Save
            </button>
            <button
              onClick={() => derivedHook.openDerivedDialog()}
              className="button-reset"
              style={{
                color: theme.palette.mode === 'dark' ? '#31d6aa' : colors.grey[900],
                borderColor: theme.palette.mode === 'dark' ? '#70d8bd' : colors.grey[700],
              }}
            >
              Create Derived
            </button>
          </div>
        </div>
      )}
      <div className="chart-container" style={{ position: 'relative', height: isDashboard ? '100%' : 'calc(100% - 40px)', width: '100%', border: `2px solid ${theme.palette.mode === 'dark' ? '#a9a9a9' : colors.grey[700]}` }} onDoubleClick={setInteractivity}>
        <div ref={chartContainerRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
        {((mgmt.activeMacroSeries || []).length === 0 && (mgmt.activeCryptoSeries || []).length === 0 && (mgmt.activeIndicatorSeries || []).length === 0 && (mgmt.activeStockSeries || []).length === 0 && (mgmt.activeDerivedSeries || []).length === 0) && !isDashboard && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
              fontSize: '16px',
              zIndex: 2,
            }}
          >
            Select a series to display
          </div>
        )}
        <div
          className="workbench-active-series-panel"
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            zIndex: 2,
            backgroundColor: theme.palette.mode === 'dark' ? colors.primary[900] : colors.primary[200],
            padding: '5px 10px',
            borderRadius: '4px',
            color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900],
            fontSize: '12px',
          }}
        >
          {!isDashboard && <div>Active Series</div>}
          {[...(mgmt.activeMacroSeries || []), ...(mgmt.activeCryptoSeries || []), ...(mgmt.activeIndicatorSeries || []), ...(mgmt.activeStockSeries || []), ...(mgmt.activeDerivedSeries || [])].map(id => {
            const isDer = (mgmt.activeDerivedSeries || []).includes(id);
            const def = isDer ? (derivedHook.derivedSeriesDefs || []).find(d => d.id === id) : null;
            const label = (availableMacroSeries[id] || availableCryptoSeries[id] || availableIndicatorSeries[id] || availableStockSeries[id] || def)?.label || id;
            const desc = isDer && derivedHook.getDerivedDescription ? derivedHook.getDerivedDescription(id) : '';
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'flex-start', marginTop: '5px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    backgroundColor: movingAverages.getSeriesColor(id, (mgmt.activeMacroSeries || []).includes(id) ? 'macro' : (mgmt.activeCryptoSeries || []).includes(id) ? 'crypto' : (mgmt.activeIndicatorSeries || []).includes(id) ? 'indicator' : (mgmt.activeStockSeries || []).includes(id) ? 'stock' : 'derived', seriesData.getSeriesColorBase),
                    marginRight: '5px',
                    marginTop: '3px',
                    flexShrink: 0,
                  }}
                />
                <div style={{ lineHeight: 1.15 }}>
                  <div>{label}</div>
                  {desc && (
                    <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '1px' }}>{desc}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className='under-chart'>
        {!isDashboard && [...(mgmt.activeMacroSeries || []), ...(mgmt.activeCryptoSeries || []), ...(mgmt.activeIndicatorSeries || []), ...(mgmt.activeStockSeries || []), ...(mgmt.activeDerivedSeries || [])].some(id => {
          let data = [];
          const type = seriesData.getSeriesType ? seriesData.getSeriesType(id, mgmt.activeDerivedSeries) : (seriesData.getType(id) || ((mgmt.activeDerivedSeries || []).includes(id) ? 'derived' : null));
          const infoForTimeKey = seriesData.getSeriesInfo(id, type);
          let raw = seriesData.getRawData(id, type);
          if (type === 'derived' && infoForTimeKey?.ratioOutput) {
            raw = resolveRatioChartPoints(infoForTimeKey, raw, scaleModeState);
          }
          const valueKey = seriesData.getValueKey(id);
          const timeKey = (type === 'indicator' && infoForTimeKey?.dataKey === 'txMvrvData') ? 'date' : 'time';
          const norm = raw
            .filter(item => item[valueKey] != null && !isNaN(parseFloat(item[valueKey])))
            .map(item => ({
              time: item[timeKey] || item.date || item.end_date || (item.timestamp ? new Date(item.timestamp * 1000).toISOString().split('T')[0] : null),
              value: parseFloat(item[valueKey]),
            }))
            .filter(item => item.time !== null)
            .sort((a, b) => new Date(a.time) - new Date(b.time));
          data = movingAverages.getSeriesData(id, norm);
          return data?.length > 0;
        }) && (
          <div style={{ marginTop: '10px' }}>
            <span style={{ color: colors.greenAccent[500] }}>
              Last Updated:{' '}
              {new Date(
                Math.max(
                  ...[...(mgmt.activeMacroSeries || []), ...(mgmt.activeCryptoSeries || []), ...(mgmt.activeIndicatorSeries || []), ...(mgmt.activeStockSeries || []), ...(mgmt.activeDerivedSeries || [])].map(id => {
                    const type = seriesData.getSeriesType ? seriesData.getSeriesType(id, mgmt.activeDerivedSeries) : (seriesData.getType(id) || ((mgmt.activeDerivedSeries || []).includes(id) ? 'derived' : null));
                    if (type === 'derived') {
                      const inputIds = derivedHook.getDerivedInputIds ? derivedHook.getDerivedInputIds(id) : [];
                      if (inputIds.length > 0) {
                        const actDer = mgmt.activeDerivedSeries || [];
                        return Math.max(0, ...inputIds.map(sid => {
                          const st = seriesData.getSeriesType ? seriesData.getSeriesType(sid, actDer) : seriesData.getType(sid);
                          const effType = st || (actDer.includes(sid) ? 'derived' : null);
                          return seriesData.getLastTime(sid, effType);
                        }));
                      }
                      return 0;
                    } else {
                      return seriesData.getLastTime(id, type);
                    }
                  })
                )
              ).toISOString().split('T')[0]}
            </span>
          </div>
        )}
      </div>
      {/* Old React tooltip disabled, we now use a high-performance direct-DOM tooltip updated via requestAnimationFrame.
          This enables smooth, constant (per-frame) updates even with heavy long-series data like SP500 + many macros. */}
      {/* {!isDashboard && tooltipData && ... (old React tooltip removed for perf) } */}
      {!isDashboard && explanation && (
        <ChartInfoSections
          sx={{ color: theme.palette.mode === 'dark' ? colors.grey[100] : colors.grey[900] }}
          sections={[{ title: 'What it is', content: explanation }]}
        />
      )}
      </div>
    </ErrorBoundary>
  );
}
