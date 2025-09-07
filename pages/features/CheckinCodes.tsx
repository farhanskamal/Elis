import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/apiService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

const CheckinCodes: React.FC = () => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const fetchCode = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.getCheckinCode();
            setCode(response.code);
        } catch (error) {
            console.error("Failed to fetch check-in code:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCode();
    }, [fetchCode]);

    const handleGenerateNewCode = async () => {
        setGenerating(true);
        try {
            const response = await api.generateNewCheckinCode();
            setCode(response.code);
        } catch (error) {
            console.error("Failed to generate new code:", error);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Check-in Codes</h1>
            <Card className="max-w-md mx-auto text-center">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">Current Daily Check-in Code</h2>
                <p className="text-gray-500 text-sm mb-4">
                    Volunteers must use this code to log their hours for the day.
                </p>
                {loading ? <Spinner /> : (
                    <div className="bg-gray-100 p-4 rounded-lg my-4">
                        <p className="text-5xl font-bold tracking-widest text-blue-600">{code}</p>
                    </div>
                )}
                <Button 
                    onClick={handleGenerateNewCode} 
                    disabled={generating} 
                    className="w-full"
                >
                    {generating ? 'Generating...' : 'Generate New Code'}
                </Button>
                 <p className="text-xs text-gray-400 mt-2">
                    Generating a new code will invalidate the old one immediately.
                </p>
            </Card>
        </div>
    );
};

export default CheckinCodes;
