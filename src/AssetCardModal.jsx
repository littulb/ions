import React from 'react';
import { Modal, Box, Backdrop, Fade } from '@mui/material';
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

const AssetCardModal = ({ asset, open, handleClose }) => {
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
          {/* We only render the AssetCard if an asset is selected.
              The modal's open state is controlled by this. */}
          {asset && <AssetCard asset={asset} />}
        </Box>
      </Fade>
    </Modal>
  );
};

export default AssetCardModal;
