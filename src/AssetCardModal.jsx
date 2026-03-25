import React from 'react';
import { Modal, Box, Backdrop, Fade, IconButton } from '@mui/material';
import AssetCard from './assetCard'; // Assuming AssetCard is the detailed view

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', md: '80%' },
  maxWidth: '1200px',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 0, // Padding will be handled by the card
  overflowY: 'auto',
  maxHeight: '90vh',
  borderRadius: 2, // Rounded corners
};

const AssetCardModal = ({ asset, open, handleClose, restoredGps }) => {
  return (
    <Modal
      aria-labelledby="asset-details-modal-title"
      aria-describedby="asset-details-modal-description"
      open={open}
      onClose={handleClose}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
      }}
    >
      <Fade in={open}>
        <Box sx={modalStyle}>
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: '#e0e6ed',
              zIndex: 100,
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.8)' },
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
          </IconButton>
          {/* We only render the AssetCard if an asset is selected.
              The modal's open state is controlled by this. */}
          {asset && <AssetCard asset={asset} handleClose={handleClose} restoredGps={restoredGps} />}
        </Box>
      </Fade>
    </Modal>
  );
};

export default AssetCardModal;
