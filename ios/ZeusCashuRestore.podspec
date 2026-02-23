Pod::Spec.new do |s|
  s.name             = 'ZeusCashuRestore'
  s.version          = '0.1.0'
  s.summary          = 'Zeus Cashu Restore - NUT-13 restore for v1 legacy seeds'
  s.description      = <<-DESC
    Standalone NUT-13 restore implementation for v1 legacy cashu seeds.
    Returns a cashu token string that CDK can receive.
  DESC

  s.homepage         = 'https://github.com/ZeusLN/zeus-cashu-restore'
  s.license          = { :type => 'MIT' }
  s.author           = { 'Zeus' => 'hello@zeusln.com' }
  s.source           = { :git => 'https://github.com/ZeusLN/zeus-cashu-restore.git', :tag => s.version.to_s }

  s.ios.deployment_target = '13.0'
  s.swift_version = '5.0'

  # Vendored xcframework
  s.vendored_frameworks = 'ZeusRestore/zeusRestoreFFI.xcframework'

  # Source files - UniFFI-generated Swift bindings
  s.source_files = 'CashuDevKit/zeus_cashu_restore.swift'

  # Framework dependencies
  s.frameworks = 'Foundation'

  # Static library settings
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'ENABLE_BITCODE' => 'NO'
  }

  s.user_target_xcconfig = {
    'ENABLE_BITCODE' => 'NO'
  }

  # Preserve paths for the framework
  s.preserve_paths = 'ZeusRestore/zeusRestoreFFI.xcframework/**/*'
end
