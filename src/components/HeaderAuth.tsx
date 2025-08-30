import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import useSupabaseAuth from '@/lib/useSupabaseAuth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const HeaderAuth: React.FC = () => {
  const { user, signOut } = useSupabaseAuth()
  const navigate = useNavigate()

  if (user) {
    const avatar = (user as any).user_metadata?.avatar_url || (user as any).avatar_url
    const email = (user as any).email
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {avatar ? (
            <img
              src={avatar}
              alt={email || 'profile'}
              className="h-8 w-8 rounded-full object-cover border cursor-pointer"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted grid place-items-center border cursor-pointer">
              <User className="h-4 w-4" />
            </div>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="max-w-[16rem] truncate">{email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/auth">Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut().then(() => navigate('/'))}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Link to="/auth">
      <Button variant="ghost" size="sm" className="btn-glass" aria-label="Auth">
        <User className="h-4 w-4" />
      </Button>
    </Link>
  )
}

export default HeaderAuth
