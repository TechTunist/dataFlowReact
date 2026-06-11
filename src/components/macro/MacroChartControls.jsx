import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  ListSubheader,
} from '@mui/material';
import {
  SMOOTHING_OPTIONS,
  OVERLAY_NONE,
  getOverlaySeriesOptions,
  getOverlaySeriesLabel,
} from '../../utils/macroChartUtils';

const selectSx = (colors) => ({
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
});

const ScaleToggle = ({ label, checked, onChange, colors }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="slider round" />
    </label>
    <span style={{ color: colors.primary[100], fontSize: '0.9rem' }}>
      {label}: {checked ? 'Log' : 'Linear'}
    </span>
  </div>
);

const MacroChartControls = ({
  colors,
  overlaySeriesId,
  onOverlayChange,
  smoothingPeriod,
  onSmoothingChange,
  primaryScaleMode,
  onPrimaryScaleChange,
  overlayScaleMode,
  onOverlayScaleChange,
  showOverlayScale = false,
  enableOverlay = true,
  excludeOverlayIds = [],
  primaryLabel = 'Primary',
  overlayLabel = 'Overlay',
}) => {
  const overlayGroups = getOverlaySeriesOptions(excludeOverlayIds);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        marginBottom: '20px',
        marginTop: '8px',
      }}
    >
      {enableOverlay && (
        <FormControl sx={{ minWidth: '150px', width: { xs: '100%', sm: '260px' } }}>
          <InputLabel id="overlay-asset-label" shrink sx={labelSx(colors)}>
            Compare Asset
          </InputLabel>
          <Select
            value={overlaySeriesId}
            onChange={(e) => onOverlayChange(e.target.value)}
            labelId="overlay-asset-label"
            label="Compare Asset"
            sx={selectSx(colors)}
          >
            <MenuItem value={OVERLAY_NONE}>
              <span>None</span>
            </MenuItem>
            {overlayGroups.map((group) => [
              <ListSubheader key={`header-${group.label}`} sx={{ color: colors.greenAccent[400], lineHeight: '28px' }}>
                {group.label}
              </ListSubheader>,
              ...group.options.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.label}
                </MenuItem>
              )),
            ])}
          </Select>
        </FormControl>
      )}

      <FormControl sx={{ minWidth: '120px', width: { xs: '100%', sm: '180px' } }}>
        <InputLabel id="smoothing-label" shrink sx={labelSx(colors)}>
          Smoothing
        </InputLabel>
        <Select
          value={smoothingPeriod}
          onChange={(e) => onSmoothingChange(Number(e.target.value))}
          labelId="smoothing-label"
          label="Smoothing"
          sx={selectSx(colors)}
        >
          {SMOOTHING_OPTIONS.map(({ value, label }) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <ScaleToggle
          label={primaryLabel}
          checked={primaryScaleMode === 1}
          onChange={onPrimaryScaleChange}
          colors={colors}
        />
        {showOverlayScale && (
          <ScaleToggle
            label={overlayLabel}
            checked={overlayScaleMode === 1}
            onChange={onOverlayScaleChange}
            colors={colors}
          />
        )}
      </Box>
    </Box>
  );
};

export { getOverlaySeriesLabel };
export default MacroChartControls;