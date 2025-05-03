// src/components/TestAPI.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TestAPI = () => {
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('https://vercel-dataflow.vercel.app/api/test/');
        setResponse(res.data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchData();
  }, []);

  if (error) return <div>Error: {error}</div>;
  if (!response) return <div>Loading...</div>;

  return (
    <div>
      <h2>Test API Response</h2>
      <pre>{JSON.stringify(response, null, 2)}</pre>
    </div>
  );
};

export default TestAPI;