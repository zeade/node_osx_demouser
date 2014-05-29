//  Node add-on to access Mac OS X
//  - screen resolution
//  - mouse emulation (move, click, etc)
//
//  Copyright (c) 2014 Micah Jaffe.

#import <v8.h>
#import <node.h>

#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>
#import <ApplicationServices/ApplicationServices.h>

using namespace node;
using namespace v8;

class OSX {

  public:
    static void Init(v8::Handle<Object> target) {
      HandleScope scope;
      NODE_SET_METHOD(target, "screen", Screen);
      NODE_SET_METHOD(target, "mouseMove", MouseMove);
      NODE_SET_METHOD(target, "mouseDown", MouseDown);
      NODE_SET_METHOD(target, "mouseUp", MouseUp);
      NODE_SET_METHOD(target, "mouseDrag", MouseDrag);
      NODE_SET_METHOD(target, "scrollWheel", ScrollWheel);
      NODE_DEFINE_CONSTANT(target, kCGEventMouseMoved);
      NODE_DEFINE_CONSTANT(target, kCGEventLeftMouseDown);
      NODE_DEFINE_CONSTANT(target, kCGEventRightMouseDown);
      NODE_DEFINE_CONSTANT(target, kCGEventRightMouseUp);
      NODE_DEFINE_CONSTANT(target, kCGEventLeftMouseUp);
      NODE_DEFINE_CONSTANT(target, kCGEventLeftMouseDragged);
      NODE_DEFINE_CONSTANT(target, kCGEventScrollWheel);
    }

    static void PostMouseEvent(CGMouseButton evMouseButton, CGEventType evType, const CGPoint evPoint, NSInteger evNumber) {
      // Not sure what to do with kCGEventSourceStatePrivate
      CGEventRef myEvent = CGEventCreateMouseEvent(NULL, evType, evPoint, evMouseButton);
      CGEventSetFlags(myEvent, 0);
      // CGEventSetType(myEvent, evType);
      CGEventSetIntegerValueField(myEvent, kCGMouseEventClickState, 1);
      CGEventSetIntegerValueField(myEvent, kCGMouseEventSubtype, NX_SUBTYPE_MOUSE_TOUCH);
      if (evNumber) {
        CGEventSetIntegerValueField(myEvent, kCGMouseEventNumber, evNumber);
      }
      CGEventPost(kCGHIDEventTap, myEvent);
      CFRelease(myEvent);
    }
    
    static v8::Handle<Value> GetMouseArgs(const Arguments& args, CGPoint& evPoint, CGMouseButton& evMouseButton, NSInteger& evNumber) {
      // Get our x,y
      if (args.Length() < 2) {
        return ThrowException(Exception::TypeError(String::New("GetMouseArgs requires arguments: x, y, mouseButton (optional)")));
      }
      if (!args[0]->IsInt32() || !args[1]->IsInt32()) {
        return ThrowException(Exception::TypeError(String::New("GetMouseArgs x, y arguments must be int32")));
      }
      evPoint = CGPointMake((CGFloat)args[0]->ToInteger()->Int32Value(), (CGFloat)args[1]->ToInteger()->Int32Value());
      
      // Mouse button
      evMouseButton = 0;
      if (args.Length() >= 3 && args[2]->IsInt32()) {
        evMouseButton = args[2]->ToInteger()->Int32Value();
        if (evMouseButton > 31) {
          return ThrowException(Exception::TypeError(String::New("GetMouseArgs mouseButton must be 0 to 31")));
        }
      }

      // Optional event number
      evNumber = 0;
      if (args.Length() >= 4 && args[3]->IsInt32()) {
        evNumber = args[3]->ToInteger()->Int32Value();
      }              
      return Undefined();
    }
    
    static v8::Handle<Value> GetScrollArgs(const Arguments& args, CGWheelCount& wheelCount, int32_t& xScroll, int32_t& yScroll) {
      if (args.Length() < 3) {
        return ThrowException(Exception::TypeError(String::New("GetScrollArgs requires arguments: wheelCount, xScroll, yScroll")));
      }
      if (!args[0]->IsInt32() || !args[1]->IsInt32() || !args[2]->IsInt32()) {
        return ThrowException(Exception::TypeError(String::New("GetScrollArgs arguments must be int32")));
      }
      wheelCount = args[0]->ToInteger()->Int32Value();
      xScroll = args[1]->ToInteger()->Int32Value();
      yScroll = args[2]->ToInteger()->Int32Value();
      return Undefined();
    }
    
    static v8::Handle<Value> MouseEvent(CGEventType evType, const Arguments& args) {
      HandleScope scope;
      CGMouseButton evMouseButton;
      CGPoint evPoint;
      NSInteger evNumber;
      v8::Handle<Value> rv = GetMouseArgs(args, evPoint, evMouseButton, evNumber);      
      if (rv->IsUndefined()) {
        PostMouseEvent(evMouseButton, evType, evPoint, evNumber);
      }      
      return rv;
    }
    
    static v8::Handle<Value> MouseMove(const Arguments& args) {
      return MouseEvent(kCGEventMouseMoved, args);
    }

    static v8::Handle<Value> MouseDown(const Arguments& args) {
      return MouseEvent(kCGEventLeftMouseDown, args);
    }

    static v8::Handle<Value> MouseUp(const Arguments& args) {
      return MouseEvent(kCGEventLeftMouseUp, args);
    }

    static v8::Handle<Value> MouseDrag(const Arguments& args) {
      return MouseEvent(kCGEventLeftMouseDragged, args);
    }

    static v8::Handle<Value> MouseRightDown(const Arguments& args) {
      return MouseEvent(kCGEventRightMouseDown, args);
    }

    static v8::Handle<Value> MouseRightUp(const Arguments& args) {
      return MouseEvent(kCGEventRightMouseUp, args);
    }
    
    static v8::Handle<Value> ScrollWheel(const Arguments& args) {
      HandleScope scope;        
      int32_t xScroll, yScroll;
      CGWheelCount wheelCount;
      
      v8::Handle<Value> rv = GetScrollArgs(args, wheelCount, xScroll, yScroll);

      if (rv->IsUndefined()) {
        CGEventRef myEvent = CGEventCreateScrollWheelEvent(NULL, kCGScrollEventUnitPixel, wheelCount, xScroll, yScroll);
        CGEventSetIntegerValueField(myEvent, kCGScrollWheelEventIsContinuous, 1);
        CGEventPost(kCGHIDEventTap, myEvent);
        CFRelease(myEvent);
      }
      return rv;
    }
        
    static v8::Handle<Value> Screen(const Arguments& args) {
      HandleScope scope;
      Local<Object> result = Object::New();
      
      // TODO: might need to figure out which screen we are interested in if multiple monitors
      NSRect r = [[[NSScreen screens] objectAtIndex:0] frame];

      // TODO: would be less weird to grab the actual mouse x,y instead of centering it start
      result->Set(String::NewSymbol("originX"), Integer::New(r.size.width / 2));
      result->Set(String::NewSymbol("originY"), Integer::New(r.size.height / 2));
      result->Set(String::NewSymbol("sizeWidth"), Integer::New(r.size.width));
      result->Set(String::NewSymbol("sizeHeight"), Integer::New(r.size.height));
      
      return scope.Close(result);
    }    
};

extern "C" {
  static void init(v8::Handle<Object> target) {
    OSX::Init(target);
  }

  NODE_MODULE(osx, init);
}
