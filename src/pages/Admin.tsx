import React, { useState, useEffect } from 'react';
import { 
  Trash2, Users, Key, Eye, EyeOff, Search, AlertCircle, ArrowDownRight, 
  ArrowUpRight, Loader2, CheckCircle, Clock, UserPlus, Menu, X
} from 'lucide-react';
import { makeApiRequest } from '../utils/api';

interface User {
  username: string;
  password: string;
}

interface PasswordChangeForm {
  username: string;
  newPassword: string;
  confirmPassword: string;
}

interface Transaction {
  operation_type: string;
  transaction_id: string;
  date: string;
  details: {
    item_id: string;
    username: string;
    [key: string]: any;
  };
  timestamp: string;
}

interface CreateUserForm {
  username: string;
  password: string;
  confirmPassword: string;
}

const Admin = () => {
  const [selectedSection, setSelectedSection] = useState<string>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    username: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirmPassword, setShowCreateConfirmPassword] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const sections = [
    { id: 'transactions', label: 'Delete Transaction', icon: Trash2 },
    { id: 'users', label: 'View Users', icon: Users },
    { id: 'password', label: 'Change User Password', icon: Key },
    { id: 'watch', label: 'Watch Transaction', icon: Eye },
    { id: 'create', label: 'Create User', icon: UserPlus }
  ];

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await makeApiRequest({
        operation: "AdminViewUsers",
        username: "admin",
        password: "37773"
      });
      setUsers(response);
    } catch (error: any) {
      setError(error?.message || 'Failed to fetch users');
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSection === 'users') {
      fetchUsers();
    }
  }, [selectedSection]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError(null);
    setSuccessMessage(null);

    if (createUserForm.password !== createUserForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (createUserForm.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsCreatingUser(true);

    try {
      const response = await makeApiRequest({
        operation: "RegisterUser",
        username: createUserForm.username,
        password: createUserForm.password
      });

      if (response.message === "User registered successfully.") {
        setSuccessMessage('User registered successfully');
        setCreateUserForm({
          username: '',
          password: '',
          confirmPassword: ''
        });
        await fetchUsers();
      } else if (response.error === "Username already registered.") {
        setError('Username already registered');
      } else {
        setError('Try again with different Username and Password');
      }
    } catch (error: any) {
      setError(error?.message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError(null);
    setSuccessMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await makeApiRequest({
        operation: "AdminUpdateUser",
        username: "admin",
        password: "37773",
        username_to_update: passwordForm.username,
        new_password: passwordForm.newPassword
      });

      if (response) {
        setSuccessMessage(`Password successfully updated for user ${passwordForm.username}`);
        setPasswordForm({
          username: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error: any) {
      setError(error?.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleWatchTransactions = async () => {
    setIsLoadingTransactions(true);
    setError(null);
    
    try {
      const response = await makeApiRequest({
        operation: "GetAllStockTransactions",
        username: "admin"
      });
      
      setTransactions(response);
      setSuccessMessage('Successfully fetched stock transactions');
    } catch (error: any) {
      setError(error?.message || 'Failed to fetch transactions');
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
      setShowConfirmDialog(false);
    }
  };

  const handleDeleteTransaction = async () => {
    setIsDeletingTransaction(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await makeApiRequest({
        operation: "DeleteTransactionData",
        username: "admin",
        password: "37773"
      });

      if (response) {
        setSuccessMessage('Transaction deleted successfully');
      }
    } catch (error: any) {
      setError(error?.message || 'Failed to delete transaction');
    } finally {
      setIsDeletingTransaction(false);
      setShowDeleteConfirmDialog(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Mobile Navigation */}
        <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'} border-b`}>
          <div className="p-4 space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setSelectedSection(section.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-2 px-4 py-3 rounded-lg ${
                  selectedSection === section.id
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <section.icon className="h-5 w-5" />
                <span className="font-medium">{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex border-b">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setSelectedSection(section.id)}
              className={`flex-1 px-4 py-3 flex items-center justify-center space-x-2 ${
                selectedSection === section.id
                  ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <section.icon className="h-5 w-5" />
              <span className="font-medium hidden lg:inline">{section.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {selectedSection === 'transactions' && (
            <div className="bg-white rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Delete Transaction</h2>
              
              {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </div>
                </div>
              )}

              <button 
                onClick={() => setShowDeleteConfirmDialog(true)}
                disabled={isDeletingTransaction}
                className={`w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center justify-center ${
                  isDeletingTransaction ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Delete Transaction
              </button>

              {showDeleteConfirmDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 className="text-lg font-semibold mb-4">Warning</h3>
                    <p className="text-gray-600 mb-6">
                      Warning: This action cannot be undone. The transaction will be permanently removed from the system.
                      Are you sure you want to delete the transaction?
                    </p>
                    <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={() => setShowDeleteConfirmDialog(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteTransaction}
                        disabled={isDeletingTransaction}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center w-full sm:w-auto"
                      >
                        {isDeletingTransaction ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedSection === 'users' && (
            <div className="bg-white rounded-lg">
              <h2 className="text-xl font-semibold mb-4">View Users</h2>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Username
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Password Hash
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredUsers.map((user, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.username}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-500 font-mono break-all">
                                  {user.password}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {filteredUsers.length === 0 && !isLoading && (
                        <div className="text-center py-8 text-gray-500">
                          {searchQuery ? 'No users match your search' : 'No users found'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedSection === 'password' && (
            <div className="bg-white rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Change User Password</h2>
              
              {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username to Update</label>
                  <input
                    type="text"
                    placeholder="Enter username"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    value={passwordForm.username}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className={`w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center ${
                    isChangingPassword ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {isChangingPassword ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Key className="h-5 w-5 mr-2" />
                  )}
                  {isChangingPassword ? 'Updating Password...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}

          {selectedSection === 'watch' && (
            <div className="bg-white rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Watch Transaction</h2>
              
              {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <button
                  onClick={() => setShowConfirmDialog(true)}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  View All Stock Transactions
                </button>

                {isLoadingTransactions ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Transaction History</h3>
                    <div className="space-y-3">
                      {transactions.map((transaction, index) => (
                        <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-start space-x-3">
                              {transaction.operation_type === 'SubtractStockQuantity' ? (
                                <ArrowDownRight className="h-5 w-5 text-red-500 flex-shrink-0" />
                              ) : (
                                <ArrowUpRight className="h-5 w-5 text-green-500 flex-shrink-0" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {transaction.operation_type}
                                </p>
                                <p className="text-xs text-gray-500">
                                  ID: {transaction.transaction_id}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock className="h-4 w-4 mr-1" />
                              {transaction.timestamp}
                            </div>
                          </div>
                          <div className="mt-2 bg-gray-50 rounded-md p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-500">Item ID:</span>
                                <span className="ml-2 font-medium">{transaction.details.item_id}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">User:</span>
                                <span className="ml-2 font-medium">{transaction.details.username}</span>
                              </div>
                              {Object.entries(transaction.details).map(([key, value]) => {
                                if (key !== 'item_id' && key !== 'username') {
                                  return (
                                    <div key={key}>
                                      <span className="text-gray-500">{key}:</span>
                                      <span className="ml-2 font-medium">
                                        {typeof value === 'object' ? JSON.stringify(value) : value}
                                      </span>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No transactions to display. Click the button above to load transactions.
                  </div>
                )}
              </div>

              {showConfirmDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 className="text-lg font-semibold mb-4">Confirm Action</h3>
                    <p className="text-gray-600 mb-6">
                      Are you sure you want to view all stock transactions?
                    </p>
                    <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={() => setShowConfirmDialog(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleWatchTransactions}
                        disabled={isLoadingTransactions}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center w-full sm:w-auto"
                      >
                        {isLoadingTransactions ? (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </div>
                        ) : (
                          'Confirm'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedSection === 'create' && (
            <div className="bg-white rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Create New User</h2>
              
              {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    placeholder="Enter username"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    value={createUserForm.username}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? "text" : "password"}
                      placeholder="Enter password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                      value={createUserForm.password}
                      onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                    >
                      {showCreatePassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showCreateConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                      value={createUserForm.confirmPassword}
                      onChange={(e) => setCreateUserForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowCreateConfirmPassword(!showCreateConfirmPassword)}
                    >
                      {showCreateConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className={`w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center ${
                    isCreatingUser ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {isCreatingUser ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-5 w-5 mr-2" />
                  )}
                  {isCreatingUser ? 'Creating User...' : 'Create User'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;

