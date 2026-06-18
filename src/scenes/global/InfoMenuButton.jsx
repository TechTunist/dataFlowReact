import React, { useState } from "react";
import { IconButton, Menu, MenuItem } from "@mui/material";
import { useTheme } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useNavigate } from "react-router-dom";
import { tokens } from "../../theme";

const InfoMenuButton = ({ compact = false, className }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClose = () => setAnchorEl(null);

  const handleNavigate = (path) => {
    navigate(path);
    handleClose();
  };

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label="info menu"
        className={className}
        size="small"
        sx={{
          color: colors.primary[100],
          p: compact ? "3px" : undefined,
          minWidth: compact ? 32 : undefined,
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: compact ? 18 : undefined }} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: {
            backgroundColor: colors.primary[800],
            color: colors.grey[100],
            minWidth: "160px",
            py: 0.5,
          },
        }}
      >
        <MenuItem
          onClick={() => handleNavigate("/about")}
          sx={{
            fontSize: "13.5px",
            py: 0.6,
            px: 1.5,
            "&:hover": { backgroundColor: colors.primary[700] },
          }}
        >
          About
        </MenuItem>
        <MenuItem
          onClick={() => handleNavigate("/bitcoin-whitepaper")}
          sx={{
            fontSize: "13.5px",
            py: 0.6,
            px: 1.5,
            "&:hover": { backgroundColor: colors.primary[700] },
          }}
        >
          Why Bitcoin?
        </MenuItem>
      </Menu>
    </>
  );
};

export default InfoMenuButton;