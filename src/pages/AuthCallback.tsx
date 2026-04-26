import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'

export const AuthCallback = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session after email confirmation
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) throw error

        if (session) {
          // Check if owner has dogs
          const { data: dogs } = await supabase
            .from('dogs')
            .select('id')
            .eq('owner_id', session.user.id)
            .limit(1)

          if (dogs && dogs.length > 0) {
            navigate('/feed')
          } else {
            navigate('/my-dogs')
          }
        } else {
          navigate('/auth')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        navigate('/auth')
      }
    }

    handleCallback()
  }, [navigate])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center gap-4">
      <div className="text-6xl animate-bounce">
        🐾
      </div>
      <h2 className="text-amber-800 text-xl font-bold">
        Email confirmed!
      </h2>
      <p className="text-amber-600">
        Taking you to Panchi...
      </p>
      <div className="flex gap-1 mt-2">
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0ms]"/>
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:150ms]"/>
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:300ms]"/>
      </div>
    </div>
  )
}

export default AuthCallback;
