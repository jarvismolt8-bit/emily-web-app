import { useState, FormEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface PasswordGateProps {
  onAuth: (username: string, password: string) => Promise<boolean>
}

export default function PasswordGate({ onAuth }: PasswordGateProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError('Username and password are required')
      return
    }
    
    setLoading(true)
    setError('')
    
    const success = await onAuth(username, password)
    
    setLoading(false)
    
    if (!success) {
      setError('Invalid credentials')
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl md:text-3xl">🥖</CardTitle>
          <p className="text-muted-foreground text-lg">Emily's Web App</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <Label htmlFor="username" className="text-muted-foreground">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username..."
                className="mt-2"
                autoComplete="username"
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="password" className="text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="mt-2"
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-destructive text-sm mb-4">{error}</p>}
            <Button type="submit" variant="outline" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
