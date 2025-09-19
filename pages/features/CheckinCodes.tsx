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
                    {generating ? (
                        <>
                            <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <RefreshIcon className="w-4 h-4 mr-2" />
                            Generate New Code
                        </>
                    )}
                </Button>
                 <p className="text-xs text-gray-400 mt-2">
                    Generating a new code will invalidate the old one immediately.
                </p>
            </Card>
        </div>
    );
};

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export default CheckinCodes;
