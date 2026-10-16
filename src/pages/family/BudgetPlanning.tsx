import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, PieChart, TrendingUp, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";

interface BudgetCategory {
  id: string;
  name: string;
  description: string | null;
  monthly_limit: number;
  color: string;
  spent?: number;
}

interface Expense {
  id: string;
  amount: number;
  description: string;
  expense_date: string;
  category_id: string | null;
  notes: string | null;
  budget_categories?: { name: string; color: string };
}

export default function BudgetPlanning() {
  const { t } = useTranslation();
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, canManageFinances } = useFamilyAuth(familySlug);
  
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    monthly_limit: "",
    color: "#667eea"
  });
  
  const [expenseForm, setExpenseForm] = useState({
    category_id: "",
    amount: "",
    description: "",
    expense_date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  useEffect(() => {
    if (family?.id) {
      loadData();
    }
  }, [family?.id]);

  const loadData = async () => {
    if (!family?.id) return;
    
    try {
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("budget_categories")
        .select("*")
        .eq("family_id", family.id)
        .order("name");

      if (categoriesError) throw categoriesError;

      // Load expenses for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select(`
          *,
          budget_categories (name, color)
        `)
        .eq("family_id", family.id)
        .gte("expense_date", startOfMonth.toISOString().split('T')[0])
        .lt("expense_date", endOfMonth.toISOString().split('T')[0])
        .order("expense_date", { ascending: false });

      if (expensesError) throw expensesError;

      // Calculate spent per category
      const categoriesWithSpent = (categoriesData || []).map(cat => {
        const spent = (expensesData || [])
          .filter(exp => exp.category_id === cat.id)
          .reduce((sum, exp) => sum + Number(exp.amount), 0);
        return { ...cat, spent };
      });

      setCategories(categoriesWithSpent);
      setExpenses(expensesData || []);
    } catch (error) {
      console.error("Error loading budget data:", error);
      toast.error(t("famBudgetPlanning.failedToLoadBudgetData"));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!family?.id || !categoryForm.name || !categoryForm.monthly_limit) {
      toast.error(t("famBudgetPlanning.pleaseFillInAllRequired"));
      return;
    }

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("budget_categories")
          .update({
            name: categoryForm.name,
            description: categoryForm.description || null,
            monthly_limit: Number(categoryForm.monthly_limit),
            color: categoryForm.color
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success(t("famBudgetPlanning.categoryUpdated"));
      } else {
        const { error } = await supabase
          .from("budget_categories")
          .insert({
            family_id: family.id,
            name: categoryForm.name,
            description: categoryForm.description || null,
            monthly_limit: Number(categoryForm.monthly_limit),
            color: categoryForm.color
          });

        if (error) throw error;
        toast.success(t("famBudgetPlanning.categoryCreated"));
      }

      setCategoryDialogOpen(false);
      setEditingCategory(null);
      setCategoryForm({ name: "", description: "", monthly_limit: "", color: "#667eea" });
      loadData();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error(t("famBudgetPlanning.failedToSaveCategory"));
    }
  };

  const handleSaveExpense = async () => {
    if (!family?.id || !expenseForm.amount || !expenseForm.description) {
      toast.error(t("famBudgetPlanning.pleaseFillInAllRequired"));
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("expenses")
        .insert({
          family_id: family.id,
          category_id: expenseForm.category_id || null,
          amount: Number(expenseForm.amount),
          description: expenseForm.description,
          expense_date: expenseForm.expense_date,
          notes: expenseForm.notes || null,
          created_by: user?.id
        });

      if (error) throw error;

      toast.success(t("famBudgetPlanning.expenseRecorded"));
      setExpenseDialogOpen(false);
      setExpenseForm({
        category_id: "",
        amount: "",
        description: "",
        expense_date: new Date().toISOString().split('T')[0],
        notes: ""
      });
      loadData();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error(t("famBudgetPlanning.failedToSaveExpense"));
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const { error } = await supabase
        .from("budget_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;
      toast.success(t("famBudgetPlanning.categoryDeleted"));
      loadData();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error(t("famBudgetPlanning.failedToDeleteCategory"));
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (error) throw error;
      toast.success(t("famBudgetPlanning.expenseDeleted"));
      loadData();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error(t("famBudgetPlanning.failedToDeleteExpense"));
    }
  };

  const totalBudget = categories.reduce((sum, cat) => sum + Number(cat.monthly_limit), 0);
  const totalSpent = categories.reduce((sum, cat) => sum + (cat.spent || 0), 0);
  const remaining = totalBudget - totalSpent;

  if (!family) {
    return <div className="p-6">{t("famBudgetPlanning.loading")}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/family/${familySlug}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("famBudgetPlanning.budgetPlanning")}</h1>
            <p className="text-muted-foreground">{t("famBudgetPlanning.trackExpensesAndManageBudgets")}</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("famBudgetPlanning.totalBudget")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{totalBudget.toLocaleString()} FCFA</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("famBudgetPlanning.totalSpent")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="text-2xl font-bold">{totalSpent.toLocaleString()} FCFA</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}% of budget
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("famBudgetPlanning.remaining")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className={`h-4 w-4 ${remaining < 0 ? 'text-red-500' : 'text-green-500'}`} />
                <span className="text-2xl font-bold">{remaining.toLocaleString()} FCFA</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Budget Categories */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("famBudgetPlanning.budgetCategories")}</CardTitle>
                  <CardDescription>{t("famBudgetPlanning.monthlySpendingLimitsByCategory")}</CardDescription>
                </div>
                {canManageFinances && (
                  <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => {
                        setEditingCategory(null);
                        setCategoryForm({ name: "", description: "", monthly_limit: "", color: "#667eea" });
                      }}>
                        <Plus className="h-4 w-4 mr-1" />
                        {t("famBudgetPlanning.addCategory")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingCategory ? "Edit" : "Add"} Budget Category</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>{t("famBudgetPlanning.categoryName")}</Label>
                          <Input
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                            placeholder="e.g., Meeting Expenses"
                          />
                        </div>
                        <div>
                          <Label>{t("famBudgetPlanning.description")}</Label>
                          <Textarea
                            value={categoryForm.description}
                            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                            placeholder={t("famBudgetPlanning.optionalDescription")}
                          />
                        </div>
                        <div>
                          <Label>Monthly Limit (FCFA)</Label>
                          <Input
                            type="number"
                            value={categoryForm.monthly_limit}
                            onChange={(e) => setCategoryForm({ ...categoryForm, monthly_limit: e.target.value })}
                            placeholder="25000"
                          />
                        </div>
                        <div>
                          <Label>{t("famBudgetPlanning.color")}</Label>
                          <Input
                            type="color"
                            value={categoryForm.color}
                            onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                          />
                        </div>
                        <Button onClick={handleSaveCategory} className="w-full">
                          {editingCategory ? "Update" : "Create"} Category
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categories.map((category) => (
                  <div key={category.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      {canManageFinances && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCategory(category);
                              setCategoryForm({
                                name: category.name,
                                description: category.description || "",
                                monthly_limit: category.monthly_limit.toString(),
                                color: category.color
                              });
                              setCategoryDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {(category.spent || 0).toLocaleString()} / {Number(category.monthly_limit).toLocaleString()} FCFA
                        </span>
                        <span className="font-medium">
                          {Number(category.monthly_limit) > 0
                            ? Math.round(((category.spent || 0) / Number(category.monthly_limit)) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Number(category.monthly_limit) > 0
                                ? ((category.spent || 0) / Number(category.monthly_limit)) * 100
                                : 0
                            )}%`,
                            backgroundColor: category.color
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {t("famBudgetPlanning.noBudgetCategoriesYetCreate")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("famBudgetPlanning.recentExpenses")}</CardTitle>
                  <CardDescription>{t("famBudgetPlanning.thisMonthSSpendingActivity")}</CardDescription>
                </div>
                {canManageFinances && (
                  <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        {t("famBudgetPlanning.addExpense")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("famBudgetPlanning.recordExpense")}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>{t("famBudgetPlanning.category")}</Label>
                          <Select
                            value={expenseForm.category_id}
                            onValueChange={(value) => setExpenseForm({ ...expenseForm, category_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Amount (FCFA)</Label>
                          <Input
                            type="number"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            placeholder="5000"
                          />
                        </div>
                        <div>
                          <Label>{t("famBudgetPlanning.description")}</Label>
                          <Input
                            value={expenseForm.description}
                            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                            placeholder={t("famBudgetPlanning.whatWasPurchased")}
                          />
                        </div>
                        <div>
                          <Label>{t("famBudgetPlanning.date")}</Label>
                          <Input
                            type="date"
                            value={expenseForm.expense_date}
                            onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>{t("famBudgetPlanning.notes")}</Label>
                          <Textarea
                            value={expenseForm.notes}
                            onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                            placeholder={t("famBudgetPlanning.optionalNotes")}
                          />
                        </div>
                        <Button onClick={handleSaveExpense} className="w-full">
                          {t("famBudgetPlanning.recordExpense")}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between border-b pb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {expense.budget_categories && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: expense.budget_categories.color }}
                          />
                        )}
                        <span className="font-medium">{expense.description}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
                        {expense.budget_categories && (
                          <span>{expense.budget_categories.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{Number(expense.amount).toLocaleString()} FCFA</span>
                      {canManageFinances && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {expenses.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {t("famBudgetPlanning.noExpensesRecordedThisMonth")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
