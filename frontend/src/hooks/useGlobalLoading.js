import { useState, useEffect } from 'react'
import { subscribeToLoadingState } from '../utils/api'

const useGlobalLoading = () => {
     const [isLoading, setIsLoading] = useState(false)

     useEffect(() => {
          const unsubscribe = subscribeToLoadingState(setIsLoading)
          return unsubscribe
     }, [])

     return isLoading
}

export default useGlobalLoading