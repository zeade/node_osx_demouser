{
 'conditions': [
   ['OS == "mac"', {
      'targets': [
        {
          'target_name': 'osx',
          # 'defines': [ '__MACOSX_CORE__' ],
          # 'direct_dependent_settings': {
          #   'mac_framework_dirs': [ 
          #     '$(SDKROOT)/System/Library/Frameworks/ApplicationServices.framework/Frameworks',
          #     '$(SDKROOT)/System/Library/Frameworks/Foundation.framework/',
          #     '$(SDKROOT)/System/Library/Frameworks/AppKit.framework/'
          #   ],
          # },
          'xcode_settings': {
            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
            'MACOSX_DEPLOYMENT_TARGET': '10.5',
            'OTHER_CFLAGS': [
              '-v', '-ObjC++'
            ]
          },
          'link_settings': {
            'libraries': [
              '-lobjc', '-framework ApplicationServices', '-framework Foundation', '-framework AppKit'
            ]
          },
          'sources': [ 'src/osx.cc' ]
        }
      ]
   }]
 ]
}