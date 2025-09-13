import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  Plus, 
  DollarSign, 
  ShoppingCart, 
  Car, 
  Home, 
  Coffee, 
  Film, 
  Target,
  AlertTriangle,
  User,
  Wallet
} from 'lucide-react';
import Chart from 'chart.js/auto';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
}

interface BudgetAlert {
  category: string;
  exceeded: number;
  budget: number;
}

const categoryIcons: Record<string, JSX.Element> = {
  'Groceries': <ShoppingCart className="w-4 h-4" />,
  'Transportation': <Car className="w-4 h-4" />,
  'Utilities': <Home className="w-4 h-4" />,
  'Dining': <Coffee className="w-4 h-4" />,
  'Entertainment': <Film className="w-4 h-4" />,
  'Other': <DollarSign className="w-4 h-4" />
};

const categoryColors: Record<string, string> = {
  'Groceries': '#10b981',
  'Transportation': '#3b82f6',
  'Utilities': '#f59e0b',
  'Dining': '#ef4444',
  'Entertainment': '#8b5cf6',
  'Other': '#6b7280'
};

export const FinSmartDashboard = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [newTransaction, setNewTransaction] = useState({ description: '', amount: '', date: '' });
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '', savedAmount: '' });
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  
  const spendingChartRef = useRef<HTMLCanvasElement>(null);
  const categoryChartRef = useRef<HTMLCanvasElement>(null);
  const spendingChartInstance = useRef<Chart | null>(null);
  const categoryChartInstance = useRef<Chart | null>(null);

  // AI categorization function
  const categorizeExpense = (description: string): string => {
    const desc = description.toLowerCase();
    if (desc.includes('grocery') || desc.includes('food') || desc.includes('walmart') || desc.includes('supermarket')) return 'Groceries';
    if (desc.includes('gas') || desc.includes('uber') || desc.includes('taxi') || desc.includes('transport')) return 'Transportation';
    if (desc.includes('electric') || desc.includes('water') || desc.includes('utility') || desc.includes('internet')) return 'Utilities';
    if (desc.includes('restaurant') || desc.includes('coffee') || desc.includes('dining') || desc.includes('pizza')) return 'Dining';
    if (desc.includes('movie') || desc.includes('netflix') || desc.includes('game') || desc.includes('entertainment')) return 'Entertainment';
    return 'Other';
  };

  // Load data from localStorage
  useEffect(() => {
    const savedTransactions = localStorage.getItem('finSmart_transactions');
    const savedGoals = localStorage.getItem('finSmart_goals');
    
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    } else {
      // Sample data
      const sampleTransactions = [
        { id: '1', description: 'Grocery Store', amount: 85.50, date: '2024-01-15', category: 'Groceries' },
        { id: '2', description: 'Gas Station', amount: 45.00, date: '2024-01-14', category: 'Transportation' },
        { id: '3', description: 'Netflix Subscription', amount: 15.99, date: '2024-01-13', category: 'Entertainment' },
        { id: '4', description: 'Electric Bill', amount: 120.00, date: '2024-01-12', category: 'Utilities' },
        { id: '5', description: 'Coffee Shop', amount: 4.50, date: '2024-01-11', category: 'Dining' }
      ];
      setTransactions(sampleTransactions);
    }

    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    } else {
      // Sample goals
      const sampleGoals = [
        { id: '1', name: 'Emergency Fund', targetAmount: 5000, savedAmount: 2800 },
        { id: '2', name: 'Vacation Fund', targetAmount: 3000, savedAmount: 1200 }
      ];
      setGoals(sampleGoals);
    }
    
    // Check budget alerts
    checkBudgetAlerts();
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('finSmart_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('finSmart_goals', JSON.stringify(goals));
  }, [goals]);

  // Check budget alerts
  const checkBudgetAlerts = () => {
    const categoryBudgets = {
      'Groceries': 300,
      'Transportation': 200,
      'Utilities': 150,
      'Dining': 150,
      'Entertainment': 100
    };

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlySpending = transactions
      .filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      })
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const alerts: BudgetAlert[] = [];
    Object.entries(categoryBudgets).forEach(([category, budget]) => {
      const spent = monthlySpending[category] || 0;
      if (spent > budget) {
        alerts.push({
          category,
          exceeded: spent - budget,
          budget
        });
      }
    });

    setBudgetAlerts(alerts);
  };

  // Create charts
  useEffect(() => {
    if (transactions.length > 0) {
      createSpendingChart();
      createCategoryChart();
    }
    
    return () => {
      if (spendingChartInstance.current) {
        spendingChartInstance.current.destroy();
      }
      if (categoryChartInstance.current) {
        categoryChartInstance.current.destroy();
      }
    };
  }, [transactions]);

  const createSpendingChart = () => {
    if (!spendingChartRef.current) return;
    
    if (spendingChartInstance.current) {
      spendingChartInstance.current.destroy();
    }

    const ctx = spendingChartRef.current.getContext('2d');
    if (!ctx) return;

    // Generate trend data (simplified)
    const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const pastSpending = [850, 920, 780, 890, 950, 0]; // Last month is 0 (current)
    const currentSpending = transactions.reduce((sum, t) => sum + t.amount, 0);
    pastSpending[5] = currentSpending;
    
    // Predict next 3 months (simple trend + 5%)
    const avgSpending = pastSpending.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const predictedSpending = [
      avgSpending * 1.05,
      avgSpending * 1.08,
      avgSpending * 1.12
    ];

    spendingChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [...months, 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Actual Spending',
            data: [...pastSpending, null, null, null],
            borderColor: 'rgb(37, 99, 235)',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Predicted Spending',
            data: [null, null, null, null, null, currentSpending, ...predictedSpending],
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderDash: [5, 5],
            tension: 0.4,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value;
              }
            }
          }
        }
      }
    });
  };

  const createCategoryChart = () => {
    if (!categoryChartRef.current) return;
    
    if (categoryChartInstance.current) {
      categoryChartInstance.current.destroy();
    }

    const ctx = categoryChartRef.current.getContext('2d');
    if (!ctx) return;

    // Calculate spending by category
    const categorySpending = transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const categories = Object.keys(categorySpending);
    const amounts = Object.values(categorySpending);
    const colors = categories.map(cat => categoryColors[cat] || '#6b7280');

    categoryChartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [{
          data: amounts,
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  };

  const addTransaction = () => {
    if (!newTransaction.description || !newTransaction.amount || !newTransaction.date) return;

    const transaction: Transaction = {
      id: Date.now().toString(),
      description: newTransaction.description,
      amount: parseFloat(newTransaction.amount),
      date: newTransaction.date,
      category: categorizeExpense(newTransaction.description)
    };

    setTransactions(prev => [transaction, ...prev]);
    setNewTransaction({ description: '', amount: '', date: '' });
    checkBudgetAlerts();
  };

  const addGoal = () => {
    if (!newGoal.name || !newGoal.targetAmount) return;

    const goal: Goal = {
      id: Date.now().toString(),
      name: newGoal.name,
      targetAmount: parseFloat(newGoal.targetAmount),
      savedAmount: parseFloat(newGoal.savedAmount) || 0
    };

    setGoals(prev => [...prev, goal]);
    setNewGoal({ name: '', targetAmount: '', savedAmount: '' });
    setIsGoalModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary shadow-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">FinSmart AI</h1>
                <p className="text-blue-100">Personal Finance Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="text-white">
                <p className="font-medium">John Doe</p>
                <p className="text-sm text-blue-100">Premium User</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Budget Alerts */}
        {budgetAlerts.length > 0 && (
          <div className="space-y-4">
            {budgetAlerts.map((alert, index) => (
              <Alert key={index} className="border-warning bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning-foreground">
                  <strong>Budget Alert:</strong> You've exceeded your {alert.category} budget by ${alert.exceeded.toFixed(2)}. 
                  Budget: ${alert.budget}, Spent: ${(alert.budget + alert.exceeded).toFixed(2)}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Transaction Entry */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="w-5 h-5 text-primary" />
              <span>Add New Transaction</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Description"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
              />
              <Input
                type="number"
                placeholder="Amount"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
              />
              <Input
                type="date"
                value={newTransaction.date}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, date: e.target.value }))}
              />
              <Button onClick={addTransaction} className="bg-gradient-primary hover:opacity-90">
                Add Transaction
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-success" />
                <span>Spending Trend & Predictions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <canvas ref={spendingChartRef}></canvas>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <canvas ref={categoryChartRef}></canvas>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions & Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Transactions */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="text-primary">
                        {categoryIcons[transaction.category]}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {transaction.category}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{transaction.date}</span>
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-destructive">-${transaction.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Goals */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-success" />
                  <span>Financial Goals</span>
                </CardTitle>
                <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Goal
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Financial Goal</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Goal name"
                        value={newGoal.name}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
                      />
                      <Input
                        type="number"
                        placeholder="Target amount"
                        value={newGoal.targetAmount}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, targetAmount: e.target.value }))}
                      />
                      <Input
                        type="number"
                        placeholder="Amount saved so far"
                        value={newGoal.savedAmount}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, savedAmount: e.target.value }))}
                      />
                      <Button onClick={addGoal} className="w-full bg-gradient-success hover:opacity-90">
                        Add Goal
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {goals.map((goal) => {
                  const progress = (goal.savedAmount / goal.targetAmount) * 100;
                  return (
                    <div key={goal.id}>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{goal.name}</h4>
                        <span className="text-sm text-muted-foreground">
                          ${goal.savedAmount.toFixed(2)} / ${goal.targetAmount.toFixed(2)}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-sm text-muted-foreground mt-1">
                        {progress.toFixed(1)}% complete
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};