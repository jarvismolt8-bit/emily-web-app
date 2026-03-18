import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CATEGORIES = ['Income', 'Investment', 'Food', 'Pet Food', 'Transport', 'Utilities', 'Shopping', 'Entertainment', 'Health', 'Airbnb', 'Bank', 'Other', 'Clothing']
const CURRENCIES = ['PHP', 'USD', 'EUR']

interface CashflowEntry {
  id?: string
  date: string
  time: string
  item: string
  notes?: string
  category: string
  currency: string
  amount: number
}

interface CashflowFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (entry: CashflowEntry) => void
  initialData?: CashflowEntry | null
}

const PRIORITIES = ['high', 'medium', 'low']

export default function CashflowFormModal({ open, onOpenChange, onSave, initialData }: CashflowFormModalProps) {
  const isEdit = !!initialData?.id
  
  const [formData, setFormData] = useState<CashflowEntry>({
    date: '',
    time: '',
    item: '',
    notes: '',
    category: 'Food',
    currency: 'PHP',
    amount: 0
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        date: initialData.date || '',
        time: initialData.time || '',
        item: initialData.item || '',
        notes: initialData.notes || '',
        category: initialData.category || 'Food',
        currency: initialData.currency || 'PHP',
        amount: initialData.amount || 0
      })
    } else {
      setFormData({
        date: '',
        time: '',
        item: '',
        notes: '',
        category: 'Food',
        currency: 'PHP',
        amount: 0
      })
    }
  }, [initialData, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="w-full">
              <Label htmlFor="date" className="text-muted-foreground">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-2 w-full"
                required
              />
            </div>
            <div className="w-full">
              <Label htmlFor="time" className="text-muted-foreground">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="mt-2 w-full"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="item" className="text-muted-foreground">Item</Label>
            <Input
              id="item"
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              placeholder="e.g., Grocery, Salary, Rent"
              className="mt-2"
              required
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-muted-foreground">Notes (optional)</Label>
            <Input
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes..."
              className="mt-2"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 w-full md:w-auto">
              <Label className="text-muted-foreground">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 w-full md:w-auto">
              <Label className="text-muted-foreground">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(val) => setFormData({ ...formData, currency: val })}
              >
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(curr => (
                    <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="amount" className="text-muted-foreground">
              Amount {formData.category === 'Income' || formData.category === 'Investment' ? '(positive)' : '(negative for expense)'}
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              placeholder={formData.category === 'Income' || formData.category === 'Investment' ? "e.g., 10000" : "e.g., -500"}
              className="mt-2"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {isEdit ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
