import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'

interface PasswordVisibilityIconProps {
  open: boolean
}

export default function PasswordVisibilityIcon({ open }: PasswordVisibilityIconProps) {
  return open ? <EyeOutlined aria-hidden="true" /> : <EyeInvisibleOutlined aria-hidden="true" />
}
