import axios, { AxiosError } from 'axios';

const API_BASE_URL = 'https://bx26utwfoetmcyyr3uvj7rqqry0kkmmc.lambda-url.us-east-2.on.aws/';
const MAX_RETRIES = 1;
const INITIAL_RETRY_DELAY = 1000;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 1000000 // 10 second timeout
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  config.method = 'POST';
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    if (response.data?.error) {
      throw new Error(response.data.error);
    }
    return response.data;
  },
  (error: AxiosError) => {
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
    }

    if (error.response?.status === 401) {
      throw new Error('Invalid username or password.');
    }

    throw new Error(
      error.response?.data?.message || 
      error.response?.data?.error || 
      error.message || 
      'An unexpected error occurred'
    );
  }
);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function makeApiRequest<T = any>(
  payload: Record<string, any>,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await apiClient.post<any, T>('', payload);
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on authentication errors
      if (error instanceof AxiosError && error.response?.status === 401) {
        throw error;
      }
      
      if (attempt < retries) {
        await sleep(INITIAL_RETRY_DELAY * Math.pow(2, attempt));
        attempt++;
        continue;
      }
      break;
    }
  }
  
  throw lastError || new Error('Request failed after multiple retries');
}

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.code === 'ERR_NETWORK') {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    
    if (error.response?.status === 401) {
      return 'Invalid username or password.';
    }
    
    return error.response?.data?.message || 
           error.response?.data?.error || 
           error.message || 
           'An unexpected error occurred';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

export async function loginUser(username: string, password: string): Promise<any> {
  try {
    const response = await makeApiRequest({
      operation: 'LoginUser',
      username: username.trim(),
      password: password.trim()
    });
    
    return response;
  } catch (error) {
    throw error;
  }
}

export async function fetchReportData(reportType: string, user: { username: string }, date?: string, month?: string) {
  let payload;
  
  switch (reportType) {
    case 'daily':
      payload = {
        operation: "GetDailyReport",
        report_date: date,
        username: user.username
      };
      break;
    case 'weekly':
      payload = {
        operation: "GetWeeklyReport",
        start_date: date,
        end_date: date,
        username: user.username
      };
      break;
    case 'monthly':
      payload = {
        operation: "GetMonthlyReport",
        month: month,
        username: user.username
      };
      break;
    default:
      throw new Error('Invalid report type');
  }

  return makeApiRequest(payload);
}