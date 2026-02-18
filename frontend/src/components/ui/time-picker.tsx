import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TimePickerProps {
  value?: string
  onChange: (value: string) => void
}

const HOURS = [
  '12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'
]

const MINUTES = [
  '00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'
]

const PERIODS = ['am', 'pm']

export function TimePicker({ value, onChange }: TimePickerProps) {
  const parseValue = (val: string | undefined) => {
    if (!val) return { hour: '', minute: '', period: '' }
    
    const match = val.toLowerCase().match(/(\d{1,2}):(\d{2})\s*(am|pm)?/)
    if (match) {
      let hour = match[1]
      const minute = match[2]
      const period = match[3] || 'am'
      
      if (hour.length === 1) hour = '0' + hour
      
      return { hour, minute, period }
    }
    return { hour: '', minute: '', period: '' }
  }

  const { hour, minute, period } = parseValue(value)

  const handleChange = (newHour: string, newMinute: string, newPeriod: string) => {
    if (newHour && newMinute && newPeriod) {
      onChange(`${newHour}:${newMinute}${newPeriod}`)
    } else {
      onChange('')
    }
  }

  return (
    <div className="flex gap-1">
      <Select
        value={hour}
        onValueChange={(h) => handleChange(h, minute || '00', period || 'am')}
      >
        <SelectTrigger className="w-[70px]">
          <SelectValue placeholder="Hr" />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map(h => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="flex items-center text-muted-foreground">:</span>
      <Select
        value={minute}
        onValueChange={(m) => handleChange(hour || '12', m, period || 'am')}
      >
        <SelectTrigger className="w-[70px]">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map(m => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={period}
        onValueChange={(p) => handleChange(hour || '12', minute || '00', p)}
      >
        <SelectTrigger className="w-[65px]">
          <SelectValue placeholder="AM" />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map(p => (
            <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
