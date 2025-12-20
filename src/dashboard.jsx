import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Paper, Typography, Grid } from '@mui/material';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'assets'));
        const assetsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setAssets(assetsData);
      } catch (error) {
        console.error('Error fetching assets: ', error);
      }
      setLoading(false);
    };

    fetchAssets();
  }, []);

  const killSwitchActivated = assets.filter(asset => asset.killSwitch).length;
  const killSwitchNotActivated = assets.length - killSwitchActivated;

  const data = {
    labels: ['Activated', 'Not Activated'],
    datasets: [
      {
        label: 'Kill Switch Status',
        data: [killSwitchActivated, killSwitchNotActivated],
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  return (
    <Grid container spacing={3}>
        <Grid item xs={12}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 400 }}>
                <Typography component="h2" variant="h6" color="primary" gutterBottom>
                    Kill Switch Status
                </Typography>
                <Doughnut data={data} />
            </Paper>
        </Grid>
    </Grid>
  );
};

export default Dashboard;
