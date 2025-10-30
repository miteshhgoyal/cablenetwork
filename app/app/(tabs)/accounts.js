import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Platform, Alert } from 'react-native'
import React, { useState, useEffect, useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import api from '@/services/api'

const Accounts = () => {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('Real')

    // State
    const [accounts, setAccounts] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(null)

    // Filter state
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('newest')
    const [platformFilter, setPlatformFilter] = useState('all')
    const [classFilter, setClassFilter] = useState('all')
    const [balanceRangeFilter, setBalanceRangeFilter] = useState('all')
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => {
        fetchAccounts()
    }, [activeTab])

    const fetchAccounts = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await api.get('/account/my-accounts')

            if (response.data.success) {
                setAccounts(response.data.data)
            }
        } catch (err) {
            console.error('Failed to fetch accounts:', err)
            setError(err.response?.data?.message || 'Failed to load accounts')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const onRefresh = useCallback(() => {
        setRefreshing(true)
        fetchAccounts()
    }, [])

    // Filter and sort accounts
    const getFilteredAccounts = () => {
        let filtered = accounts

        // Filter by account type (tab)
        filtered = filtered.filter((acc) => {
            if (activeTab === 'Real') return acc.accountType === 'Real' && acc.status !== 'closed'
            if (activeTab === 'Demo') return acc.accountType === 'Demo' && acc.status !== 'closed'
            if (activeTab === 'Archived') return acc.status === 'closed'
            return true
        })

        // Search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase()
            filtered = filtered.filter(
                (acc) =>
                    acc.accountNumber?.toLowerCase().includes(searchLower) ||
                    acc.login?.toLowerCase().includes(searchLower) ||
                    acc.platform?.toLowerCase().includes(searchLower) ||
                    acc.accountClass?.toLowerCase().includes(searchLower) ||
                    acc.server?.toLowerCase().includes(searchLower)
            )
        }

        // Platform filter
        if (platformFilter !== 'all') {
            filtered = filtered.filter((acc) => acc.platform === platformFilter)
        }

        // Class filter
        if (classFilter !== 'all') {
            filtered = filtered.filter((acc) => acc.accountClass === classFilter)
        }

        // Balance range filter
        if (balanceRangeFilter !== 'all') {
            const [min, max] = balanceRangeFilter.split('-').map(Number)
            filtered = filtered.filter((acc) => {
                const balance = acc.balance || 0
                return balance >= min && (max ? balance <= max : true)
            })
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.createdAt) - new Date(a.createdAt)
                case 'oldest':
                    return new Date(a.createdAt) - new Date(b.createdAt)
                case 'balance-high':
                    return (b.balance || 0) - (a.balance || 0)
                case 'balance-low':
                    return (a.balance || 0) - (b.balance || 0)
                case 'name-asc':
                    return (a.accountNumber || '').localeCompare(b.accountNumber || '')
                case 'name-desc':
                    return (b.accountNumber || '').localeCompare(a.accountNumber || '')
                default:
                    return 0
            }
        })

        return filtered
    }

    const filteredAccounts = getFilteredAccounts()

    // Get unique values for filters
    const platformOptions = [...new Set(accounts.map((acc) => acc.platform))].filter(Boolean)
    const classOptions = [...new Set(accounts.map((acc) => acc.accountClass))].filter(Boolean)

    // Check if filters are active
    const hasActiveFilters =
        searchTerm !== '' ||
        platformFilter !== 'all' ||
        classFilter !== 'all' ||
        balanceRangeFilter !== 'all' ||
        sortBy !== 'newest'

    const clearFilters = () => {
        setSearchTerm('')
        setSortBy('newest')
        setPlatformFilter('all')
        setClassFilter('all')
        setBalanceRangeFilter('all')
    }

    // Count accounts by type
    const realCount = accounts.filter(
        (acc) => acc.accountType === 'Real' && acc.status !== 'closed'
    ).length
    const demoCount = accounts.filter(
        (acc) => acc.accountType === 'Demo' && acc.status !== 'closed'
    ).length
    const archivedCount = accounts.filter(
        (acc) => acc.status === 'closed'
    ).length

    const handleReactivate = async (accountId) => {
        try {
            const response = await api.patch(`/account/${accountId}/status`, {
                status: 'active',
            })

            if (response.data.success) {
                Alert.alert('Success', 'Account reactivated successfully')
                fetchAccounts()
            }
        } catch (err) {
            console.error('Failed to reactivate account:', err)
            Alert.alert('Error', 'Failed to reactivate account')
        }
    }

    const copyToClipboard = async (text, label) => {
        await Clipboard.setStringAsync(text)
        Alert.alert('Copied', `${label} copied to clipboard`)
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-6 py-4 border-b border-gray-200">
                <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-2xl font-bold text-gray-900">Trading Accounts</Text>
                    <TouchableOpacity
                        onPress={() => router.push('/new-account')}
                        className="bg-orange-500 px-2 py-2 rounded-full flex-row items-center gap-2"
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                </View>
                <Text className="text-gray-600 text-sm">Manage your trading accounts</Text>
            </View>

            {/* Tabs */}
            <View className="bg-white border-b border-gray-200 px-6 py-3">
                <View className="flex-row gap-4">
                    <TabButton
                        label="Real Accounts"
                        count={realCount}
                        isActive={activeTab === 'Real'}
                        onPress={() => setActiveTab('Real')}
                    />
                    <TabButton
                        label="Demo Accounts"
                        count={demoCount}
                        isActive={activeTab === 'Demo'}
                        onPress={() => setActiveTab('Demo')}
                    />
                    <TabButton
                        label="Archived"
                        count={archivedCount}
                        isActive={activeTab === 'Archived'}
                        onPress={() => setActiveTab('Archived')}
                    />
                </View>
            </View>

            {/* Results Summary */}
            <View className="px-6 py-3 bg-gray-50">
                <Text className="text-sm text-gray-600">
                    Showing {filteredAccounts.length} of {accounts.filter((acc) => {
                        if (activeTab === 'Real') return acc.accountType === 'Real' && acc.status !== 'closed'
                        if (activeTab === 'Demo') return acc.accountType === 'Demo' && acc.status !== 'closed'
                        if (activeTab === 'Archived') return acc.status === 'closed'
                        return true
                    }).length} accounts
                    {hasActiveFilters && ' (Filtered)'}
                </Text>
            </View>

            {/* Accounts List */}
            <ScrollView
                className="flex-1 px-6"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#f97316']} />
                }
            >
                {loading && !refreshing ? (
                    <View className="flex-1 items-center justify-center py-12">
                        <ActivityIndicator size="large" color="#f97316" />
                    </View>
                ) : error ? (
                    <View className="bg-white rounded-lg p-8 mt-4">
                        <View className="items-center">
                            <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                            <Text className="text-xl font-semibold text-gray-900 mt-4 mb-2">Failed to Load Accounts</Text>
                            <Text className="text-gray-600 text-center mb-6">{error}</Text>
                            <TouchableOpacity
                                onPress={fetchAccounts}
                                className="bg-orange-500 px-6 py-3 rounded-lg"
                            >
                                <Text className="text-white font-semibold">Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : filteredAccounts.length === 0 ? (
                    <View className="bg-white rounded-lg p-8 mt-4">
                        <View className="items-center">
                            <Ionicons name="wallet-outline" size={64} color="#9ca3af" />
                            <Text className="text-xl font-semibold text-gray-900 mt-4 mb-2">No accounts found</Text>
                            <Text className="text-gray-600 text-center mb-6">
                                {hasActiveFilters
                                    ? 'Try adjusting your filters to see more results'
                                    : `You don't have any ${activeTab.toLowerCase()} accounts yet`}
                            </Text>
                            {!hasActiveFilters && activeTab !== 'Archived' && (
                                <TouchableOpacity
                                    onPress={() => router.push('/new-account')}
                                    className="bg-orange-500 px-6 py-3 rounded-lg flex-row items-center gap-2"
                                >
                                    <Ionicons name="add" size={20} color="white" />
                                    <Text className="text-white font-semibold">Create Your First Account</Text>
                                </TouchableOpacity>
                            )}
                            {hasActiveFilters && (
                                <TouchableOpacity
                                    onPress={clearFilters}
                                    className="bg-white border-2 border-gray-300 px-6 py-3 rounded-lg"
                                >
                                    <Text className="text-gray-900 font-semibold">Clear Filters</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ) : (
                    <View className="py-4">
                        {filteredAccounts.map((account) => (
                            <View key={account._id} className="mb-4">
                                {activeTab === 'Archived' ? (
                                    <ArchivedAccountCard
                                        account={account}
                                        onReactivate={() => handleReactivate(account._id)}
                                    />
                                ) : (
                                    <ActiveAccountCard
                                        account={account}
                                        onCopyToClipboard={copyToClipboard}
                                        router={router}
                                    />
                                )}
                            </View>
                        ))}
                        <View className="h-6" />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

// Helper Components
const TabButton = ({ label, count, isActive, onPress }) => (
    <TouchableOpacity
        onPress={onPress}
        className={`pb-2 border-b-2 ${isActive ? 'border-orange-500' : 'border-transparent'}`}
    >
        <View className="flex-row items-center gap-2">
            <Text className={`font-semibold ${isActive ? 'text-orange-500' : 'text-gray-600'}`}>
                {label}
            </Text>
            <View className={`px-2 py-0.5 rounded-full ${isActive ? 'bg-orange-100' : 'bg-gray-100'}`}>
                <Text className={`text-xs font-medium ${isActive ? 'text-orange-700' : 'text-gray-600'}`}>
                    {count}
                </Text>
            </View>
        </View>
    </TouchableOpacity>
)

// Replace ActiveAccountCard component
const ActiveAccountCard = ({ account, onCopyToClipboard, router }) => {
    const [showDetails, setShowDetails] = useState(false)

    const formatCurrency = (amount, currency) => {
        return `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    return (
        <View className="bg-white rounded-xl overflow-hidden border border-gray-200">
            {/* Header Section */}
            <View className="p-5">
                {/* Tags Row */}
                <View className="flex-row flex-wrap mb-4 gap-2">
                    <View className="border border-orange-300 px-3 py-1 rounded-full">
                        <Text className="text-orange-600 font-medium text-xs">{account.accountType}</Text>
                    </View>
                    <View className="border border-blue-300 px-3 py-1 rounded-full">
                        <Text className="text-blue-600 font-medium text-xs">{account.platform}</Text>
                    </View>
                    <View className="border border-purple-300 px-3 py-1 rounded-full">
                        <Text className="text-purple-600 font-medium text-xs">{account.accountClass}</Text>
                    </View>
                </View>

                {/* Balance Display */}
                <View className="mb-5">
                    <Text className="text-gray-500 text-xs font-medium mb-1">Available Balance</Text>
                    <Text className="text-3xl font-bold text-gray-900">
                        {formatCurrency(account.balance, account.currency)}
                    </Text>
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-3">
                    <TouchableOpacity
                        onPress={() => router.push('/deposit')}
                        className="flex-1 bg-orange-500 px-4 py-3 rounded-lg flex-row items-center justify-center gap-2"
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-down-circle" size={18} color="white" />
                        <Text className="text-white font-semibold text-sm">Deposit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push('/withdrawal')}
                        className="flex-1 border border-gray-300 px-4 py-3 rounded-lg flex-row items-center justify-center gap-2"
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-up-circle-outline" size={18} color="#374151" />
                        <Text className="text-gray-700 font-semibold text-sm">Withdraw</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stats Section */}
            <View className="px-5 py-4 border-t border-gray-200">
                <View className="flex-row flex-wrap gap-4">
                    <StatItem
                        label="Equity"
                        value={formatCurrency(account.equity || account.balance, account.currency)}
                    />
                    <StatItem
                        label="Margin"
                        value={formatCurrency(account.margin || 0, account.currency)}
                    />
                    <StatItem
                        label="Free Margin"
                        value={formatCurrency(account.freeMargin || account.balance, account.currency)}
                    />
                    <StatItem
                        label="Leverage"
                        value={account.leverage}
                    />
                </View>

                {/* Show/Hide Details Toggle */}
                <TouchableOpacity
                    onPress={() => setShowDetails(!showDetails)}
                    className="flex-row items-center justify-center mt-4 pt-4 border-t border-gray-200 gap-1"
                    activeOpacity={0.7}
                >
                    <Text className="text-gray-600 font-medium text-sm">
                        {showDetails ? 'Hide Details' : 'Show Details'}
                    </Text>
                    <Ionicons
                        name={showDetails ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#6b7280"
                    />
                </TouchableOpacity>
            </View>

            {/* Expanded Details Section */}
            {showDetails && (
                <View className="px-5 py-4 border-t border-gray-200">
                    <DetailRow
                        label="Account Number"
                        value={account.accountNumber}
                        copyable
                        onCopy={() => onCopyToClipboard(account.accountNumber, 'Account Number')}
                    />
                    <DetailRow
                        label="Login"
                        value={account.login}
                        copyable
                        onCopy={() => onCopyToClipboard(account.login, 'Login')}
                    />
                    <DetailRow
                        label="Server"
                        value={account.server}
                        copyable
                        onCopy={() => onCopyToClipboard(account.server, 'Server')}
                    />
                    <DetailRow
                        label="Created"
                        value={formatDate(account.createdAt)}
                    />
                    <DetailRow
                        label="Status"
                        value={account.status}
                        isLast={true}
                    />
                </View>
            )}
        </View>
    )
}

// Replace ArchivedAccountCard component
const ArchivedAccountCard = ({ account, onReactivate }) => {
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    const formatCurrency = (amount, currency) => {
        return `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    return (
        <View className="bg-white rounded-xl overflow-hidden border border-gray-300 opacity-60">
            <View className="p-5">
                {/* Header with Tags and Date */}
                <View className="flex-row items-start justify-between mb-4">
                    <View className="flex-row flex-wrap gap-2 flex-1 pr-3">
                        <View className="border border-gray-300 px-3 py-1 rounded-full">
                            <Text className="text-gray-500 font-medium text-xs">{account.accountType}</Text>
                        </View>
                        <View className="border border-gray-300 px-3 py-1 rounded-full">
                            <Text className="text-gray-500 font-medium text-xs">{account.platform}</Text>
                        </View>
                        <View className="border border-gray-300 px-3 py-1 rounded-full">
                            <Text className="text-gray-500 font-medium text-xs">{account.accountClass}</Text>
                        </View>
                    </View>
                    <View className="flex-row items-center gap-1">
                        <Ionicons name="time-outline" size={12} color="#9ca3af" />
                        <Text className="text-xs text-gray-500">{formatDate(account.updatedAt)}</Text>
                    </View>
                </View>

                {/* Balance and Reactivate Button */}
                <View className="flex-row items-end justify-between mb-4">
                    <View className="flex-1">
                        <Text className="text-gray-500 text-xs font-medium mb-1">Final Balance</Text>
                        <Text className="text-2xl font-bold text-gray-900">
                            {formatCurrency(account.balance, account.currency)}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={onReactivate}
                        className="bg-orange-500 px-4 py-2.5 rounded-lg flex-row items-center gap-2"
                        activeOpacity={0.8}
                    >
                        <Ionicons name="refresh-circle" size={18} color="white" />
                        <Text className="text-white font-semibold text-sm">Reactivate</Text>
                    </TouchableOpacity>
                </View>

                {/* Archive Info Banner */}
                <View className="border border-amber-300 rounded-lg p-3">
                    <View className="flex-row items-start gap-2">
                        <Ionicons name="information-circle" size={18} color="#f59e0b" />
                        <View className="flex-1">
                            <Text className="text-amber-900 text-sm font-medium mb-0.5">
                                {account.archiveReason || 'Account archived'}
                            </Text>
                            <Text className="text-amber-700 text-xs">
                                Archived on {formatDate(account.updatedAt)}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    )
}

// Replace StatItem component
const StatItem = ({ label, value }) => (
    <View className="flex-1 min-w-[120px]">
        <Text className="text-gray-500 text-xs font-medium mb-1">{label}</Text>
        <Text className="text-gray-900 font-semibold text-sm">{value}</Text>
    </View>
)

// Replace DetailRow component
const DetailRow = ({ label, value, copyable, onCopy, isLast }) => (
    <View className={`flex-row items-center justify-between py-3 ${!isLast ? 'border-b border-gray-200' : ''}`}>
        <Text className="text-gray-600 text-sm font-medium">{label}</Text>
        <View className="flex-row items-center gap-2">
            <Text className="text-gray-900 font-semibold text-sm">{value}</Text>
            {copyable && (
                <TouchableOpacity
                    onPress={onCopy}
                    className="p-1.5 rounded active:bg-gray-100"
                    activeOpacity={0.7}
                >
                    <Ionicons name="copy-outline" size={16} color="#6b7280" />
                </TouchableOpacity>
            )}
        </View>
    </View>
)


export default Accounts
