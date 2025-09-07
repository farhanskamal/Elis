import React, { useContext, useState, FormEvent } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Button from '../../components/ui/Button';

interface LoginPageProps {
    initialError?: string | null;
}

const LoginPage: React.FC<LoginPageProps> = ({ initialError }) => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password. Please try again.');
      setIsLoading(false);
    }
    // On success, the App component will redirect to the dashboard.
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3.5a1 1 0 00.002 1.84L9 9.583V14.5a1 1 0 00.553.894l2 1a1 1 0 00.894 0l2-1A1 1 0 0015 14.5V9.582l6.29-3.145a1 1 0 00.002-1.84l-7-3.5z" />
                <path d="M10 16.5a1 1 0 00.553-.894V11.586l-1.553.776a1 1 0 000 1.788l1.553.776zM10 18.5a1 1 0 00.553-.894v-2.585l-1.553.776a1 1 0 000 1.788l1.553.776z" />
            </svg>
          <h1 className="mt-4 text-3xl font-extrabold text-gray-900">
            Library Volunteer Hub
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <Button type="submit" className="w-full py-2" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>
         <div className="text-sm text-gray-500 bg-gray-100 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-700">Testing Credentials:</h4>
            <p className="mt-2"><b>Librarian:</b><br />
            Email: <code className="bg-gray-200 p-1 rounded">admin@school.edu</code><br />
            Password: <code className="bg-gray-200 p-1 rounded">password123</code></p>
            <p className="mt-2"><b>Volunteer:</b><br />
            Email: <code className="bg-gray-200 p-1 rounded">ben@student.school.edu</code><br />
            Password: <code className="bg-gray-200 p-1 rounded">password123</code></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
